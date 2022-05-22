// ==UserScript==
// @name         GM_Fetch Demo
// @namespace    gh.alttiri
// @description  GM_Fetch (wrapper for GM_xmlhttpRequest) demonstration script
// @version      0.1.8-2022.05.22-dev
// @match        https://example.com/gm_fetch-demo
// @grant        GM_xmlhttpRequest
// @connect      example.com
// ==/UserScript==

// ------------------------------------------------------------------------------------
// Init
// ------------------------------------------------------------------------------------

const GM_fetch = getGM_fetch();         // Just "import" it to use it
const fetch = GM_fetch.webContextFetch; // Default `fetch` from web page context

// ------------------------------------------------------------------------------------
// Demo
// ------------------------------------------------------------------------------------

// Just open https://example.com/gm_fetch-demo page to execute this demo
(async function() {
    const url = "https://example.com/";
    console.log("GM_fetch:", url);
    const response = await GM_fetch(url);
    console.log(response);

    const {status, statusText} = response;
    const lastModified = response.headers.get("last-modified");
    console.log({status, statusText, lastModified});

    const blob = await response.blob();
    console.log(blob);

    downloadBlob(blob, "[example.com] (GM_Fetch Demo).html", url);
})();

// ------------------------------------------------------------------------------------
// Util
// ------------------------------------------------------------------------------------
function downloadBlob(blob, name, url = "") {
    const anchor = document.createElement("a");
    anchor.setAttribute("download", name || "");
    const blobUrl = URL.createObjectURL(blob);
    anchor.href = blobUrl + "#" + url;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
}

// ------------------------------------------------------------------------------------
// GM Util
// ------------------------------------------------------------------------------------

function getGM_fetch() {
    const isStreamSupported = GM_xmlhttpRequest?.RESPONSE_TYPE_STREAM;
    const fetch = getWebPageFetch();

    function getWebPageFetch() {
        // --- [VM/GM + Firefox ~90+ + Enabled "Strict Tracking Protection"] fix --- //
        return (globalThis.wrappedJSObject && typeof globalThis.wrappedJSObject.fetch === "function") ? function(resource, init = {}) {
            if (init.headers instanceof Headers) {
                // Since `Headers` are not allowed for structured cloning.
                init.headers = Object.fromEntries(init.headers.entries());
            }
            return globalThis.wrappedJSObject.fetch(cloneInto(resource, document), cloneInto(init, document));
        } : globalThis.fetch;
    }

    /** The default Response always has {type: "default", redirected: false, url: ""} */
    class ExResponse extends Response {
        [Symbol.toStringTag] = "ExResponse";
        constructor(body, {headers, status, statusText, url, finalUrl}) {
            super(body, {status, statusText, headers: {
                    ...headers,
                    "content-type": headers.get("content-type").split("; ")[0] // Fixes Blob type ("text/html; charset=UTF-8")
                }});
            this._url = finalUrl;
            this._redirected = url !== finalUrl;
            this._headers = headers; // `HeadersLike` is more user-friendly for debug than the original `Headers` object
        }
        get redirected() { return this._redirected; }
        get url() { return this._url; }
        get type() { return "basic"; }
        /** @returns {HeadersLike} */
        get headers() { return this._headers; }
    }
    class HeadersLike {
        constructor(headers) {
            headers?.entries().forEach((key, value) => {
                this.append(key, value);
            });
        }
        get(key) {
            return this[key.toLowerCase()];
        }
        append(key, value) {
            this[key.trim().toLowerCase()] = value.trim();
        }
    }
    /**
     * Parses headers from `XMLHttpRequest.getAllResponseHeaders()` string
     * @returns {HeadersLike} */
    function parseHeaders(headersString) {
        const headers = new HeadersLike();
        for (const line of headersString.trim().split("\n")) {
            const [key, ...valueParts] = line.split(":"); // last-modified: Fri, 21 May 2021 14:46:56 GMT
            const value = valueParts.join(":");
            headers.append(key, value);
        }
        return headers;
    }
    class ResponseLike {
        constructor(blobPromise, {headers, status, statusText, url, finalUrl}) {
            /** @type {Promise<Blob>} */
            this._blobPromise = blobPromise;
            this.headers = headers;
            this.status = status;
            this.statusText = statusText;
            this.url = finalUrl;
            this.redirected = url !== finalUrl;
            this.type = "basic";
            this.ok = status.toString().startsWith("2");
            this.bodyUsed = false;
            blobPromise.then(() => this.bodyUsed = true);
        }
        blob() {        return this._blobPromise; }
        arrayBuffer() { return this._blobPromise.then(blob => blob.arrayBuffer()); }
        text() {        return this._blobPromise.then(blob => blob.text()); }
        json() {        return this._blobPromise.then(blob => blob.text()).then(text => JSON.parse(text)); }
    }

    /**
     * The simplified `fetch` — a wrapper for `GM_xmlHttpRequest`.
     * @example
     // @grant       GM_xmlhttpRequest
     const response = await fetch(url);
     const {status, statusText} = response;
     const lastModified = response.headers.get("last-modified");
     const blob = await response.blob();
     * @return {Promise<Response>} */
    async function GM_fetch(url, fetchInit = {}) {
        const defaultFetchInit = {
            method: "get",
            // Extra props:
            useStream: true, webContext: false, GM_extraOpts: {}
        };
        const opts = {...defaultFetchInit, ...fetchInit};
        if (opts.webContext) {
            delete opts.useStream;
            delete opts.webContext;
            delete opts.GM_extraOpts;
            return fetch(url, opts);
        }

        const {headers, method, useStream, GM_extraOpts} = opts;
        const HEADERS_RECEIVED = 2;
        if (!isStreamSupported || !useStream) {
            return new Promise((resolve, _reject) => {
                const blobPromise = new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        ...GM_extraOpts,
                        url,
                        method,
                        headers,
                        responseType: "blob",
                        onload: (response) => resolve(response.response),
                        onerror: reject,
                        onreadystatechange: onHeadersReceived,
                    });
                });
                blobPromise.catch(_reject);
                function onHeadersReceived(gmResponse) {
                    const {
                        readyState, responseHeaders, status, statusText, finalUrl
                    } = gmResponse;
                    if (readyState === HEADERS_RECEIVED) {
                        const headers = parseHeaders(responseHeaders);
                        const newResp = new ResponseLike(blobPromise, {
                            headers, status, statusText, url, finalUrl
                        });
                        resolve(newResp);
                    }
                }
            });
        } else {
            return new Promise((resolve, _reject) => {
                const responsePromise = new Promise((resolve, reject) => {
                    void GM_xmlhttpRequest({
                        ...GM_extraOpts,
                        url,
                        method,
                        headers,
                        responseType: "stream",
                        fetch: true,
                        onerror: reject,
                        onreadystatechange: onHeadersReceived
                    });
                });
                responsePromise.catch(_reject);
                function onHeadersReceived(gmResponse) {
                    const {
                        readyState, responseHeaders, status, statusText, finalUrl, response: readableStream
                    } = gmResponse;
                    if (readyState === HEADERS_RECEIVED) {
                        const headers = parseHeaders(responseHeaders);
                        const newResp = new ExResponse(readableStream, {headers, status, statusText, url, finalUrl});
                        resolve(newResp);
                    }
                }
            });
        }
    }

    GM_fetch.isStreamSupported = isStreamSupported;
    GM_fetch.webContextFetch = fetch;

    return GM_fetch;
}
