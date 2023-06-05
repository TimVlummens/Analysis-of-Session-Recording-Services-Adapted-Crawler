/* eslint-disable max-lines */
// eslint-disable-next-line
const { execArgv } = require("process");
// eslint-disable-next-line no-unused-vars
const puppeteer = require("puppeteer");
/**
 * @param {number} time
 */
function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

/**
 * @param {string} str
 */
function removeNewLineChar(str) {
    return str.replace(/[\n\r]+/g, " ");
}

/**
 * @param {puppeteer.Page} page
 * @param {string} xpath
 * @returns {Promise<puppeteer.ElementHandle>}
 */
async function getElementHandleFromXPath(page, xpath) {
    return (await page.$x(xpath))[0];
}

/**
 * @param {puppeteer.ElementHandle} elHandle
 * @returns {Promise<string>} xpath
 */
async function getXPathFromHandle(elHandle) {
  // @ts-ignore
  // eslint-disable-next-line no-undef
    let xpath = await elHandle.evaluate(
    el => fathom && fathom.getXPath(el),
    elHandle
  );
    return xpath;
}

/**
 * @param {puppeteer.JSHandle<any>} listHandle
 * @returns {Promise<puppeteer.ElementHandle[]>}
 */
async function getHandlesFromListHandle(listHandle) {
    const properties = await listHandle.getProperties();
    const children = [];
    for (const property of properties.values()) {
        const element = property.asElement();
        if (element) {
            children.push(element);
        }
    }
    return children;
}

/**
 * @param {puppeteer.ElementHandle} elementHandle
 * @param {string} pageUrl
 * @param {boolean} getXPath
 * @returns {Promise<fillableField>}
 * @param {function(...any):void} log
 */
async function getElementAttrs(
  elementHandle,
  pageUrl = "",
  getXPath = false,
  log = null
) {
    let boundingBox;
    let inViewPort;
    let elAttrs;
  // @ts-ignore
    if (!elementHandle) {
        return {};
    }
    try {
        boundingBox = await elementHandle.boundingBox();
        inViewPort = await elementHandle.isIntersectingViewport();
    // eslint-disable-next-line no-shadow
        elAttrs = await elementHandle.evaluate(
      (el, getXPath) => ({
        // eslint-disable-next-line no-undef
          isShown: isShown(el),
          id: el.id,
          type: el.getAttribute("type"),
          nodeType: el.nodeName,
          name: el.getAttribute("name"),
        // @ts-ignore
          href: el.href,
          class: el.className,
        // @ts-ignore
          innerText: el.innerText,
        // @ts-ignore
          ariaLabel: el.ariaLabel,
          placeholder: el.getAttribute("placeholder"),
        // @ts-ignore
        // eslint-disable-next-line no-undef
          onTop: fathom && fathom.isOnTop(el),
      }),
      elementHandle,
      getXPath
    );
    } catch (error) {
    // if(log) {log(`Error on ${pageUrl} while getting attributes: ${removeNewLineChar(error.message)}`);}
        console.log("Error from: ", pageUrl, " is: ", error);
    }

  // @ts-ignore
    return Object.assign(elAttrs, boundingBox, {inView: inViewPort});
}

/**
 * @param {string} xpath
 * @param {puppeteer.Page} page
 * @param {function(...any):void} log
 */
async function getElementAttrsByXPath(xpath, page, log) {
    const elementHandle = await getElementHandleFromXPath(page, xpath);
    let elAttributes = await getElementAttrs(
    elementHandle,
    page.url(),
    true,
    log
  );
    elAttributes.xpath = xpath;
    elAttributes.elHandle = elementHandle;
    return elAttributes;
}

/**
 * @param {any} formsOrFields
 */
function stringfyObjIncludesHandleEl(formsOrFields) {
  //Hide certain values in formsOrFields based on https://stackoverflow.com/a/61196684
    const privateProperties = ["elHandle"];
    const excludePrivateProperties = (
    /** @type {string} */ key,
    /** @type {any} */ value
  ) => (privateProperties.includes(key) ? undefined : value);
    return JSON.stringify(formsOrFields, excludePrivateProperties);
}

/**
 * @param {{ url?: any; evaluate?: ((arg0: () => any[]) => any) | ((arg0: () => any[]) => any); sleep?: (arg0: number) => any; }} page
 * @param {any} log
 */
async function getAutofillFieldsAttributes(page, log) {
    let pageURL = page.url();
    let autofillFields = [];
  // @ts-ignore
  // eslint-disable-next-line no-undef
    const xpathAutofillFields = await page.evaluate(() => {
        let xpathAutofillFields = [];
        let autofillFields = getAllPIIFields(true);
        for (const autofillField of autofillFields) {
            xpathAutofillFields.push({
                xpath: getXPathTo(autofillField.element),
                type: autofillField.fieldName,
            });
        }
        return xpathAutofillFields;
    });

    for (const xpathAutofillField of xpathAutofillFields) {
        let elementHandle = await getElementHandleFromXPath(page, xpathAutofillField.xpath, log);
        if (!elementHandle) {
            log(`Cannot find element with XPATH: ${xpathAutofillField}.`);
            continue;
        }
        let elAttributes = await getElementAttrs(elementHandle, pageURL, true, log);
    // @ts-ignore
        elAttributes.fieldName = xpathAutofillField.type;
        // log(elAttributes.fieldName);
        elAttributes.elHandle = elementHandle;
        elAttributes.xpath = xpathAutofillField.xpath;
        autofillFields.push(elAttributes);
    }
    if (autofillFields.length) {
        log(`Found ${
        autofillFields.length
      } autofillField(s): ${stringfyObjIncludesHandleEl(autofillFields)} on ${pageURL}`);
    }
    return autofillFields;
}

module.exports = {
    getAutofillFieldsAttributes,
    sleep,
    getElementHandleFromXPath,
    getXPathFromHandle,
    getHandlesFromListHandle,
    removeNewLineChar,
    getElementAttrsByXPath,
    getElementAttrs,
    stringfyObjIncludesHandleEl,
};

/**
 * @typedef matchedForm
 * @property {string} coord
 * @property {boolean} isShown
 * @property {number} pageHeight
 * @property {string} id
 * @property {string} type
 * @property {string} nodeType
 * @property {string} name
 * @property {string} href
 * @property {string} class
 * @property {string} innerText
 * @property {string} headingTexts
 * @property {string} ariaLabel
 * @property {string} action
 * @property {string} placeholder
 * @property {boolean} containsNewsletterCheckbox
 * @property {number} matchCount
 * @property {boolean} isInFooter
 * @property {string} xpath
 * @property {number} offsetTop
 * @property {boolean} onTop
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {boolean} inView
 * @property {fillableField[]} fillableElements
 * @property {boolean} foundByParentMatch
 */

/**
 * @typedef fillableField
 * @property {string} id
 * @property {boolean} isShown
 * @property {string} type
 * @property {string} nodeType
 * @property {string} name
 * @property {string} href
 * @property {string} class
 * @property {string} innerText
 * @property {string} ariaLabel
 * @property {string} placeholder
 * @property {string} xpath
 * @property {boolean} onTop
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {boolean} inView
 * @property {puppeteer.ElementHandle} elHandle
 * @property {string} fieldName
 * @property {number} score
 */
