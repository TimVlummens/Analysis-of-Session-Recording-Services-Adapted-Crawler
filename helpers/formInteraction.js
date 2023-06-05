// eslint-disable-next-line
const puppeteer = require('puppeteer');
/**
 * @param {number} maxValue
 */
function getRandomUpTo(maxValue) {
    return Math.random() * maxValue;
}

/**
 * @param {number} time
 */
function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}


/**
 * @param {puppeteer.Page} page
 * @param {puppeteer.ElementHandle} elementHandle
 */
async function scrollToElement(page, elementHandle) {
    await elementHandle.evaluate(el => {
        el.scrollIntoView({behavior: 'smooth', block: 'center', inline: 'end'});
    });
}

/**
 * @param {puppeteer.Page} page
 * @param {any} element
 * @param {string} text
 * @param {(arg0: string) => void} [log]
 */
async function fillInputElement(page, element, text, log) {
    // Keyboard events emitted by the below code match events from
    // manual typing. Tested at
    // https://w3c.github.io/uievents/tools/key-event-viewer
    const KEY_PRESS_DWELL_TIME = 100;
    const CLICK_DWELL_TIME = 100;
    const DELAY_BETWEEN_KEYS = 250;
    const elementHandle = element.elHandle;
    const elAttributes = {...element, elHandle: undefined};

    // await page.waitForTimeout(5000);

    log(`Will fill the input field ${JSON.stringify(elAttributes)} with text: ${text}`);
    await scrollToElement(page, elementHandle);
    await page.waitForTimeout(1000);
    await elementHandle.hover();
    // log("test");

    await page.waitForTimeout(500);

    // await elementHandle.click({delay: CLICK_DWELL_TIME});
    await page.mouse.down();
    await page.waitForTimeout(CLICK_DWELL_TIME);
    await page.mouse.up();

    for (const key of text) {
        let randDelayDwellTime = getRandomUpTo(KEY_PRESS_DWELL_TIME);
        let randDelayBetweenPresses = getRandomUpTo(DELAY_BETWEEN_KEYS);
        // eslint-disable-next-line no-await-in-loop
        await elementHandle.type(key, {delay: randDelayDwellTime});  // delay -> dwell time
        // eslint-disable-next-line no-await-in-loop
        await sleep(randDelayBetweenPresses);
    }
    await page.keyboard.press("Tab");  // to trigger blur
    return true;
}

/**
 * @param {puppeteer.Page} page
 * @param {function(...any):void} log
 * @param {string} hostname
 * @param {any} emailField
 */
async function fillEmailField(page, log, hostname, emailField) {
    let success = false;
    let emailToFill = "";
    let emailSuffix = hostname;
    if (emailSuffix.startsWith('www.')) {
        emailSuffix = emailSuffix.substring(4, emailSuffix.length);
    }

    let fieldHandle;
    emailToFill = getEmailToFill(emailSuffix);
    fieldHandle = emailField.elHandle;

    try{
        // improve email field detection
        if (!fieldHandle) {
            log(`Cannot find an email field`);
            return false;
        }
        // fill the email field
        await fillInputElement(page, emailField, emailToFill, log);
        success = true;
        log(`Successfully filled the email field ${JSON.stringify({...emailField, elHandle: undefined})}`);
    }catch(e) {
        log(`Cannot fill the email field: ${JSON.stringify({...emailField, elHandle: undefined})} , error_msg: ${e.message}`);
    }
    return success;
}

/**
 * @param {puppeteer.Page} page
 * @param {function(...any):void} log
 * @param {any} passwordField
 */
async function fillPasswordField(page, log, passwordField) {
    let success = false;
    let PASSWD = 'myPwd1111111111111=';

    try{
        const pwdFieldHandle = passwordField.elHandle;
        if (!pwdFieldHandle) {
            log(`Cannot find a password field`);
            return false;
        }
        // fill the password field
        await fillInputElement(page, passwordField, PASSWD, log);
        success = true;
        log(`Successfully filled the password field ${JSON.stringify({...passwordField, elHandle: undefined})}`);
    }catch(e) {
        log(`Cannot fill the password field: ${JSON.stringify({...passwordField, elHandle: undefined})} , error_msg: ${e.message}`);
    }
    return success;
}

/**
 * @param {puppeteer.Page} page
 * @param {function(...any):void} log
 * @param {any} field
 */
async function fillOtherField(page, log, field) {
    let autofillFieldWithValue = getValueOfAutofillField(field);

    let success = false;
    try{
        const autofillFieldHandle = autofillFieldWithValue.elHandle;
        if (!autofillFieldHandle) {
            log(`Cannot find a autofill field: ${field.fieldName}`);
            return false;
        }
        await fillInputElement(page, field, field.value, log);
        success = true;
        log(`Successfully filled the ${field.fieldName} field ${JSON.stringify({...field, elHandle: undefined})}`);
    }catch(e) {
        log(`Cannot fill the ${field.fieldName} field: ${JSON.stringify({...field, elHandle: undefined})} , error_msg: ${e.message}`);
    }
    return success;
}

/**
 * @param {any} lastPage
 * @param {any} log
 * @param {any} field
 * @param {any} hostname
 */
async function fillField(lastPage, log, field, hostname) {
    let fieldName = field.fieldName;
    let resultOfFilling = false;
    if(fieldName === 'email') {
        resultOfFilling = await fillEmailField(lastPage, log, hostname, field);
    } else if(fieldName === 'password') {
        resultOfFilling = await fillPasswordField(lastPage, log, field);
    } else {
        resultOfFilling= await fillOtherField(lastPage, log, field);
    }
    return resultOfFilling;
}



// @ts-ignore
function getEmailToFill(emailSuffix) {
    const emailPrefix = "timthesis40+";
    const emailDomain = "@gmail.com";
    return emailPrefix + emailSuffix + emailDomain;
}

// @ts-ignore
function getValueOfAutofillField(autofillField) {
    let value;
    switch (autofillField.fieldName) {
    case 'email':
        value = getEmailToFill("");
        break;
    case 'tel':
        value = "497413093";
        break;
    case 'organization':
        value = "Sample Company";
        break;
    case 'street-address':
        value = "Rue Jean Lorette 169";
        break;
    case 'address-line1':
        value = "number 89";
        break;
    case 'address-line2':
        value = "box 2";
        break;
    case 'address-line3':
        value = "Thuin";
        break;
    case 'address-level2':
        value = "Thuin";
        break;
    case 'address-level1':
        value = "Thuin";
        break;
    case 'postal-code':
        value = "6530";
        break;
    case 'country':
        value = "Belgium";
        break;
    case 'cc-name':
        value = "Harold Gonzalez";
        break;
    case 'name':
        value = "Harold";
        break;
    case 'given-name':
        value = "Harry";
        break;
    case 'additional-name':
        value = "Jerry";
        break;
    case 'family-name':
        value = "Gonzalez";
        break;
    case 'cc-number':
        value = "4929846523784508";
        break;
    case 'cc-exp-month':
        value = "02";
        break;
    case 'cc-exp-year':
        value = "25";
        break;
    case 'cc-exp':
        value = "02/25";
        break;
    case 'cc-type':
        value = "Mastercard";
        break;
    case 'username':
        value = "cosicadam";
        break;
    default:
        value = 'Adam';
    }
    autofillField.value = value;
    return autofillField;
}

module.exports = {
    getRandomUpTo,
    fillInputElement,
    fillField,
    sleep
};