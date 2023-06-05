const BaseCollector = require('./BaseCollector');
const { scrollPageToBottom } = require('puppeteer-autoscroll-down');
const puppeteer = require('puppeteer');
const forms = require('../helpers/formInteraction');

const fs = require('fs');
const autoFillSrc = fs.readFileSync('./helpers/autoFillDetect.js', 'utf8');
const fathomSrc = fs.readFileSync('./helpers/fathomDetect.js', 'utf8');
const isShownSrc = fs.readFileSync('./helpers/isShown.js', 'utf8');
const helperSrc = fs.readFileSync('./helpers/helper.js', 'utf8');

const pageUtils = require('../helpers/utils');

class SRSCollector extends BaseCollector {

    id() {
        return 'srs';
    }

    /**
     * @param {import('./BaseCollector').CollectorInitOptions} options 
     */
    init({
        log, url
    }) {
        this._log = log;
        this._url = url;
        /**
         * @type {ListenerData[]}
         */
        this._listeners = [];
        /**
         * @type {ScriptInfo[]}
         */
        this._scriptInfos = [];

        this._maxNumberOfFieldsFilled = 4;
        this._maxNumberOfFieldsFailed = 10;
    }
    
    /**
     * @param {{cdpClient: import('puppeteer').CDPSession, url: string, type: import('./TargetCollector').TargetType, page: any}} targetInfo 
     */
    async addTarget({cdpClient, page, type}) {
        if (page && type === 'page') {
            await page.evaluateOnNewDocument(fathomSrc);
            await page.evaluateOnNewDocument(autoFillSrc);
            await page.evaluateOnNewDocument(helperSrc);
            await page.evaluateOnNewDocument(isShownSrc);
        }
        await cdpClient.send('Runtime.enable');
        await cdpClient.send('Runtime.setAsyncCallStackDepth', {maxDepth: 32});
    }


    /**
     * @param {ScriptInfo} scriptInfo
     */
    onScriptParsed(scriptInfo) {
        // console.log("id: ", scriptInfo.scriptId);
        // console.log("url: ", scriptInfo.url);

        this._scriptInfos.push({
            scriptId: scriptInfo.scriptId,
            url: scriptInfo.url,
            startLine: scriptInfo.startLine,
            startColumn: scriptInfo.startColumn,
            endLine: scriptInfo.endLine,
            endColumn: scriptInfo.endColumn,
            sourceMapURL: scriptInfo.sourceMapURL,
            hasSourceMapURL: scriptInfo.hasSourceMapURL
        })
    }

    /**
     * @param {any} listeners
     */
    handleListenersArray(listeners) {
        for (const listener of listeners){
            this.handleListener(listener);
        }
    }

    /**
     * @param {any} listener
     */
    handleListener(listener) {
        this._listeners.push({
            type: listener.type,
            useCapture: listener.useCapture,
            passive: listener.passive,
            once: listener.once,
            scriptId: listener.scriptId,
            lineNumber: listener.lineNumber,
            columnNumber: listener.columnNumber,
            handler: listener.handler,
            originalHandler: listener.originalHandler
        });
    }

    async scrollToBottom() {
        await new Promise((resolve) => {
            var maxScrolls = 50;
            var scrolls = 0;
            var scrollTop = -1;
            const interval = setInterval(() => {
              window.scrollBy(0, 400);
              if(document.documentElement.scrollTop !== scrollTop && scrolls < maxScrolls) {
                scrollTop = document.documentElement.scrollTop;
                scrolls += 1;
                return;
              }
              clearInterval(interval);
              resolve();
            }, 10);
          });
    }

    // @ts-ignore
    // Fill in one field with the given fieldName
    // If no fields are found, indexOfFilledField = fillableFields.length
    async fillPriorityField(page, fillableFields, priorityFieldName, failedFields, successfulFields, listOfFilledTypes) {        
        let indexOfFilledField = 0;

        for (const field of fillableFields) {
            if (!field.isShown || field.fieldName !== priorityFieldName) {
                indexOfFilledField +=1;
                continue;
            }
            try {
                // Try to fill the password field

                let success = await forms.fillField(page, this._log, field, this._url.hostname)
                //await forms.fillInputElement(page, field, "test", this._log);
                if (success) {
                    successfulFields += 1;
                    listOfFilledTypes.push(priorityFieldName);
                    break;
                }
                else { failedFields += 1;}
            } catch (error) {
                this._log(`Error filling field ${field.name} with value test: ${error.message}`);
                failedFields += 1;
            }            
            indexOfFilledField +=1;
            await page.waitForTimeout(500);

            if (failedFields >= this._maxNumberOfFieldsFailed) {break;}
        }

        return [indexOfFilledField, failedFields, successfulFields, listOfFilledTypes];
    }

    // @ts-ignore
    async fillFields(page, fillableFields) {

        let successfulFields = 0;
        let failedFields = 0;
        let listOfFilledTypes = [];
        
        let indexOfFilledFieldPwd = fillableFields.lenght;
        let indexOfFilledFieldMail = fillableFields.lenght;

        // Try to fill at least one password field if present
        [indexOfFilledFieldPwd, failedFields, successfulFields, listOfFilledTypes] = await this.fillPriorityField(page, fillableFields, 'password', failedFields, successfulFields, listOfFilledTypes);

        // Try to fill at least one email field if present
        [indexOfFilledFieldMail, failedFields, successfulFields, listOfFilledTypes] = await this.fillPriorityField(page, fillableFields, 'email', failedFields, successfulFields, listOfFilledTypes);

        let indexOfOtherFields = 0;

        // Try to fill the rest of the fields
        for (const field of fillableFields) {
            if (indexOfOtherFields == indexOfFilledFieldPwd || indexOfOtherFields == indexOfFilledFieldMail) {
                indexOfOtherFields += 1;
                continue;
            }

            indexOfOtherFields += 1;
            
            if (!field.isShown) {continue;}
            try {
                let success = await forms.fillField(page, this._log, field, this._url.hostname)
                //await forms.fillInputElement(page, field, "test", this._log);
                if (success) { 
                    successfulFields += 1;
                    listOfFilledTypes.push(field.fieldName);
                }
                else { failedFields += 1;}
            } catch (error) {
                this._log(`Error filling field ${field.name} with value test: ${error.message}`);
                failedFields += 1;
            }
            await page.waitForTimeout(500);
            if (successfulFields >= this._maxNumberOfFieldsFilled || failedFields >= this._maxNumberOfFieldsFailed) {break;}
        }

        return [successfulFields, failedFields, listOfFilledTypes];
    }


    /** 
     * @param {any} page 
     */
    async pageInteraction(page) {
        await page.evaluate(this.scrollToBottom);

        let fillableFields = await pageUtils.getAutofillFieldsAttributes(page, this._log);
        this._log("fillableFields of: ", page.url(), " is ", fillableFields.length);

        let successfulFields = 0;
        let failedFields = 0;
        let listOfFilledTypes = [];

        let startTime = new Date().getTime();

        if (fillableFields.length) {
            [successfulFields, failedFields, listOfFilledTypes] = await this.fillFields(page, fillableFields);
        }

        if (!fillableFields.length || successfulFields <= 0) {
            startTime = new Date().getTime();
            // If page does not contain input fields, move mouse to create interaction
            this._log("Mouse move interaction")
            // const TimeBetweenMoves = [158, 207, 145, 174, 140, 197];
            // const MoveWidths =  [292, 103, 130, 178, 325, 433];
            // const MoveHeigths = [421, 312, 331, 232, 296, 133];

            const TimeBetweenMoves = [150, 150, 150, 150, 150, 150];
            const MoveWidths =  [290, 100, 250, 180, 320, 430];
            const MoveHeigths = [420, 310, 330, 230, 300, 130];

            let numberOfMoves = Math.min(TimeBetweenMoves.length, MoveHeigths.length, MoveWidths.length);

            for (let i = 0; i < numberOfMoves; i++) {
                await page.mouse.move(MoveWidths[i], MoveHeigths[i]);
                await page.waitForTimeout(TimeBetweenMoves[i]);
            }
        }
        
        let stopTime = new Date().getTime();

        await page.waitForTimeout(8500);
        
        return [successfulFields, startTime, stopTime, listOfFilledTypes, failedFields];
    }

    /**
     * @param {{page: any, cdpClient: import('puppeteer').CDPSession}} options
     */
    async getData({page, cdpClient}) {
        
        await page.waitForTimeout(500);
        let interactionResult = [0, 0, 0, [], 0];
        try {
            interactionResult = await this.pageInteraction(page);
        } catch(error) {
            this._log(`Form interaction failed: ${error.message}`);
        }

        // Get all script Id
        await cdpClient.send('Debugger.disable');
        await cdpClient.on('Debugger.scriptParsed', scriptInfo => this.onScriptParsed(scriptInfo));
        await cdpClient.send('Debugger.enable');

        // Get event listeners for "window"
        var {result} = await cdpClient.send('Runtime.evaluate', {expression: 'window'});
	    var {listeners} = await cdpClient.send('DOMDebugger.getEventListeners', {objectId: result.objectId, depth: -1});
        this.handleListenersArray(listeners);

        // Get event listeners for "document"
        var {result} = await cdpClient.send('Runtime.evaluate', {expression: 'document'});
	    var {listeners} = await cdpClient.send('DOMDebugger.getEventListeners', {objectId: result.objectId, depth: -1});
        this.handleListenersArray(listeners);

        var arrayScripts = this._scriptInfos
            .map(scriptInfo => ({
                scriptId: scriptInfo.scriptId,
                url: scriptInfo.url
            }))
        
        var mapScripts = new Map(arrayScripts.map((obj) => [obj.scriptId, obj.url]));

        // console.log(mapScripts);

        // return this._listeners
        //     .map(listener => ({
        //         listenerType: listener.type,
        //         scriptId: listener.scriptId,
        //         url: mapScripts.get(listener.scriptId)
        //     }));
        return [this._listeners
            .map(listener => ({
                listenerType: listener.type,
                scriptId: listener.scriptId,
                url: mapScripts.get(listener.scriptId),
                useCapture: listener.useCapture,
                passive: listener.passive,
                once: listener.once
            })), interactionResult];

        // return arrayScripts;
    }
}
module.exports = SRSCollector;
