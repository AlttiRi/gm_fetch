// ==UserScript==
// @name         GM_Fetch Demo
// @namespace    gh.alttiri
// @description  GM_Fetch (wrapper for GM_xmlhttpRequest) demonstration script
// @version      0.1.0-2022.05.22
// @match        https://example.com/gm_fetch-demo
// @grant        GM_xmlhttpRequest
// @connect      example.com
// ==/UserScript==

// ------------------------------------------------------------------------------------
// Init
// ------------------------------------------------------------------------------------

const globalFetch = ujs_getGlobalFetch();
const fetch = GM_fetch;


// ------------------------------------------------------------------------------------
// Demo
// ------------------------------------------------------------------------------------

// Just open https://example.com/gm_fetch-demo page to execute this demo
(async function() {
    const url = "https://example.com/";
    const response = await fetch(url);
    console.log(response);

    const {status, statusText} = response;
    const lastModified = response.headers.get("last-modified");
    console.log({status, statusText, lastModified});

    const blob = await response.blob();
    console.log(blob);

    downloadBlob(blob, "[example.com] (GM_Fetch Demo).html", url);
})();


// ------------------------------------------------------------------------------------
// GM Util
// ------------------------------------------------------------------------------------

function ujs_getGlobalFetch() {
    // --- [VM/GM + Firefox ~90+ + Enabled "Strict Tracking Protection"] fix --- //
    return (globalThis.wrappedJSObject && typeof globalThis.wrappedJSObject.fetch === "function") ? function(resource, init = {}) {
        if (init.headers instanceof Headers) {
            // Since `Headers` are not allowed for structured cloning.
            init.headers = Object.fromEntries(init.headers.entries());
        }
        return globalThis.wrappedJSObject.fetch(cloneInto(resource, document), cloneInto(init, document));
    } : globalThis.fetch;
}

// The simplified `fetch` — wrapper for `GM.xmlHttpRequest`
/* Using:
// @grant       GM_xmlhttpRequest

const response = await fetch(url);
const {status, statusText} = response;
const lastModifiedSeconds = response.headers.get("last-modified");
const blob = await response.blob();
*/
async function GM_fetch(url, init = {}) {
    const defaultInit = {method: "get"};
    const {headers, method} = {...defaultInit, ...init};

    return new Promise((resolve, _reject) => {
        const blobPromise = new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url,
                method,
                headers,
                responseType: "blob",
                onload: (response) => resolve(response.response),
                onerror: reject,
                onreadystatechange: onHeadersReceived
            });
        });
        blobPromise.catch(_reject);
        function onHeadersReceived(response) {
            const {
                readyState, responseHeaders, status, statusText
            } = response;
            if (readyState === 2) { // HEADERS_RECEIVED
                const headers = parseHeaders(responseHeaders);
                resolve({
                    headers,
                    status,
                    statusText,
                    arrayBuffer: () => blobPromise.then(blob => blob.arrayBuffer()),
                    blob: () => blobPromise,
                    json: () => blobPromise.then(blob => blob.text()).then(text => JSON.parse(text)),
                    text: () => blobPromise.then(blob => blob.text()),
                });
            }
        }
    });
}
function parseHeaders(headersString) {
    class Headers {
        get(key) {
            return this[key.toLowerCase()];
        }
    }
    const headers = new Headers();
    for (const line of headersString.trim().split("\n")) {
        const [key, ...valueParts] = line.split(":"); // last-modified: Fri, 21 May 2021 14:46:56 GMT
        headers[key.trim().toLowerCase()] = valueParts.join(":").trim();
    }
    return headers;
}


// ------------------------------------------------------------------------------------
// Util
// ------------------------------------------------------------------------------------
function downloadBlob(blob, name, url = "") {
    const anchor = document.createElement("a");
    anchor.setAttribute("download", name || "");
    const blobUrl = URL.createObjectURL(blob);
    anchor.href = blobUrl + "#" + url;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
}
