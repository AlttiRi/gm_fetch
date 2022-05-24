// ==UserScript==
// @name         GM_fetch Demo (2022.05.22)
// @description  GM_fetch (a wrapper for GM_xmlhttpRequest) demonstration script
// @version      0.2.6-2022.05.23-dev
// @namespace    gh.alttiri
// @match        https://example.com/gm_fetch-demo
// @grant        GM_xmlhttpRequest
// @connect      ipv4.download.thinkbroadband.com
// @connect      giant.gfycat.com
// @connect      example.com
// @connect      google.com
// ==/UserScript==


let url;
// url = "http://ipv4.download.thinkbroadband.com/10MB.zip?t=" + Date.now(); // 408 // error
 url = "https://giant.gfycat.com/ShockedSecondaryFiddlercrab.mp4";         // 200   // 32 MB
// url = "https://example.com/xxx";                                       // 404
//url = "https://example.com/"; // 200
// url = "https://google.com/";   // .redirected, .url

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
    console.log("GM_fetch:", url);
    const response = await GM_fetch(url, {
        //method: "post",
        //body: new Blob(["xxx"]),
        referrer: "https://example.net",
        extra: {
            //useStream: false,
            onprogress: (props) => {console.log(props);}
        }
    });
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
    class ResponseEx extends Response {
        [Symbol.toStringTag] = "ResponseEx";
        constructor(body, {headers, status, statusText, url, redirected}) {
            super(body, {status, statusText, headers: {
                    ...headers,
                    "content-type": headers.get("content-type").split("; ")[0] // Fixes Blob type ("text/html; charset=UTF-8") in TM
                }});
            this._url = url;
            this._redirected = redirected;
            this._headers = headers; // `HeadersLike` is more user-friendly for debug than the original `Headers` object
        }
        get redirected() { return this._redirected; }
        get url() { return this._url; }
        get type() { return "basic"; }
        /** @returns {HeadersLike} */
        get headers() { return this._headers; }
    }
    class HeadersLike { // Note: the original `Headers` throws an error if `key` requires `.trim()`
        constructor(headers) {
            headers && (Object.entries(headers)).forEach((key, value) => {
                this.append(key, value);
            });
        }
        get(key) {
            const value = this[key.trim().toLowerCase()];
            return value === undefined ? null : value;
        }
        append(key, value) {
            this[key.trim().toLowerCase()] = value.trim();
        }
        has(key) {
            return this.get(key) !== null;
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

    const identityContentEncodings = new Set([null, "identity", "no encoding"]);
    function getOnProgressProps(response) {
        const {headers, status, statusText, url, redirected, ok} = response;
        const lengthComputable = identityContentEncodings.has(headers.get("Content-Encoding"));
        const compressed = !lengthComputable;
        const contentLength = parseInt(headers.get("Content-Length"));
        // Original XHR behaviour; in TM it equals to `contentLength`, or `-1` if `contentLength` is `null`.
        const total = lengthComputable ? (isNaN(contentLength) ? 0 : contentLength) : 0;

        return {
            total, lengthComputable,
            compressed, contentLength,
            headers, status, statusText, url, redirected, ok
        };
    }

    function responseProgressProxy(response, onProgress) {
        const onProgressProps = getOnProgressProps(response);
        let loaded = 0;
        const reader = response.body.getReader();
        const readableStream = new ReadableStream({
            async start(controller) {
                while (true) {
                    const {done, /** @type {Uint8Array} */ value} = await reader.read();
                    if (done) {
                        break;
                    }
                    loaded += value.length;
                    try {
                        onProgress({loaded, ...onProgressProps});
                    } catch (e) {
                        console.error("[onProgress]:", e);
                    }
                    controller.enqueue(value);
                }
                controller.close();
                reader.releaseLock();
            },
            cancel() {
                void reader.cancel();
            }
        });
        return new ResponseEx(readableStream, response);
    }


    const HEADERS_RECEIVED = 2;

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
        const defaultFetchInit = {method: "get", headers: {}};
        const defaultExtra = {useStream: true, webContext: false, onprogress: null};
        const opts = {
            ...defaultFetchInit,
            ...fetchInit,
            extra: {
                ...defaultExtra,
                ...fetchInit.extra
            }
        };
        if (opts.extra.webContext) {
            delete opts.extra;
            return fetch(url, opts);
        }

        const {headers, method, body, referrer, extra: {useStream, onprogress}} = opts;
        delete opts.extra.webContext;
        delete opts.extra.useStream;
        const _headers = new HeadersLike(headers);
        _headers.append("referer", referrer);

        if (!isStreamSupported || !useStream) {
            const _onprogress = onprogress;
            let onProgressProps = {}; // Will be inited on HEADERS_RECEIVED. It used to have the same behaviour in TM and VM.

            return new Promise((resolve, _reject) => {
                const blobPromise = new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        ...opts.extra,
                        url,
                        method,
                        headers: _headers,
                        responseType: "blob",
                        onload: (response) => resolve(response.response),
                        onerror: reject,
                        onreadystatechange: onHeadersReceived,
                        onprogress: ({loaded/*, total, lengthComputable*/}) => {
                            _onprogress({loaded, ...onProgressProps});
                        },
                        data: body,
                    });
                });
                blobPromise.catch(_reject);
                function onHeadersReceived(gmResponse) {
                    const {
                        readyState, responseHeaders, status, statusText, finalUrl
                    } = gmResponse;
                    if (readyState === HEADERS_RECEIVED) {
                        const headers = parseHeaders(responseHeaders);
                        const response = new ResponseLike(blobPromise, {
                            headers, status, statusText, url, finalUrl
                        });
                        onProgressProps = getOnProgressProps(response);
                        resolve(response);
                    }
                }
            });
        } else {
            return new Promise((resolve, _reject) => {
                const responsePromise = new Promise((resolve, reject) => {
                    void GM_xmlhttpRequest({
                        ...opts.extra,
                        url,
                        method,
                        headers: _headers,
                        responseType: "stream",
                     /* fetch: true, */ // Not required, since it already has `responseType: "stream"`.
                        onerror: reject,
                        onreadystatechange: onHeadersReceived,
                        data: body,
                    });
                });
                responsePromise.catch(_reject);
                function onHeadersReceived(gmResponse) {
                    const {
                        readyState, responseHeaders, status, statusText, finalUrl, response: readableStream
                    } = gmResponse;
                    if (readyState === HEADERS_RECEIVED) {
                        const headers = parseHeaders(responseHeaders);
                        const redirected = url !== finalUrl;
                        let response = new ResponseEx(readableStream, {headers, status, statusText, url, redirected});
                        if (onprogress) {
                            response = responseProgressProxy(response, onprogress);
                        }
                        resolve(response);
                    }
                }
            });
        }
    }

    GM_fetch.isStreamSupported = isStreamSupported;
    GM_fetch.webContextFetch = fetch;

    return GM_fetch;
}
