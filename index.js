/*! GM_fetch — v0.3.3-2022.06.01-dev — https://github.com/AlttiRi/gm_fetch */

function getGM_fetch() {
    const GM_XHR = (typeof GM_xmlhttpRequest === "function") ? GM_xmlhttpRequest : (GM?.xmlHttpRequest);
    const isStreamSupported = GM_XHR?.RESPONSE_TYPE_STREAM;
    const fetch = getWebPageFetch();

    function getWebPageFetch() {
        let fetch = globalThis.fetch;
        // [VM/GM + Firefox ~90+ + Enabled "Strict Tracking Protection"] requires this fix.
        function fixFirefoxFetch() { // todo: test it more.
            const fixRequired = globalThis.wrappedJSObject && typeof globalThis.wrappedJSObject.fetch === "function";
            if (!fixRequired) { // It just checks is it a UserScript, or not. // Is possible to check is it Firefox?
                return;
            }
            function fixedFetch(resource, init = {}) { // todo if `Request` is passed
                if (init.headers instanceof Headers) {
                    // Since `Headers` are not allowed for structured cloning.
                    init.headers = Object.fromEntries(init.headers.entries());
                }
                return globalThis.wrappedJSObject.fetch(cloneInto(resource, document), cloneInto(init, document));
            }
            fetch = fixedFetch;
        }
        fixFirefoxFetch();
        return fetch;
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
        get type() { return "basic"; }  // todo: if "cors"
        /** @returns {HeadersLike} */
        get headers() { return this._headers; }
    }
    class HeadersLike { // Note: the original `Headers` throws an error if `key` requires `.trim()`
        constructor(headers) {
            headers && Object.entries(headers).forEach(([key, value]) => {
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

    class ReaderLike {
        constructor(blobPromise, body) {
            /** @type {Promise<Blob>} */
            this._blobPromise = blobPromise;
            /** @type {ReadableStreamDefaultReader} */
            this._reader = null;
            /** @type {ReadableStreamLike} */
            this._body = body;
            this._released = false;
        }
        /** @return {Promise<{value: Uint8Array, done: boolean}>} */
        read() {
            if (this._released) {
                throw new TypeError("This readable stream reader has been released and cannot be used to read from its previous owner stream");
            }
            this._body._used = true;
            if (this._reader === null) {
                return new Promise(async (resolve) => {
                    const blob = await this._blobPromise;
                    const response = new Response(blob);
                    this._reader = response.body.getReader();
                    const result = await this._reader.read();
                    resolve(result);
                });
            }
            return this._reader.read();
        }
        releaseLock() {
            this._body.locked = false;
            this._released = true;
        }
    }
    class ReadableStreamLike { // BodyLike
        constructor(blobPromise) {
            this.locked = false;
            this._used = false;
            this._blobPromise = blobPromise;
        }
        getReader() {
            if (this.locked) {
                throw new TypeError("ReadableStreamReader constructor can only accept readable streams that are not yet locked to a reader");
            }
            this._reader = new ReaderLike(this._blobPromise, this);
            this.locked = true;
            return this._reader;
        }
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
            this.type = "basic"; // todo: if "cors"
            this.ok = status.toString().startsWith("2");
            this._bodyUsed = false;
            this.body = new ReadableStreamLike(blobPromise);
        }
        get bodyUsed() {
            return this._bodyUsed || this.body._used;
        }
        blob() {
            if (this.bodyUsed) {
                throw new TypeError("body stream already read");
            }
            if (this.body.locked) {
                throw new TypeError("body stream is locked");
            }
            this._bodyUsed = true;
            this.body.locked = true;
            return this._blobPromise;
        }
        arrayBuffer() { return this.blob().then(blob => blob.arrayBuffer()); }
        text() {        return this.blob().then(blob => blob.text()); }
        json() {        return this.text().then(text => JSON.parse(text)); }
    }

    const identityContentEncodings = new Set([null, "identity", "no encoding"]);
    function getOnProgressProps(response) {
        const {headers, status, statusText, url, redirected, ok} = response;
        const isIdentity = identityContentEncodings.has(headers.get("Content-Encoding"));
        const compressed = !isIdentity;
        const _contentLength = parseInt(headers.get("Content-Length")); // `get()` returns `null` if no header present
        const contentLength = isNaN(_contentLength) ? null : _contentLength;
        const lengthComputable = isIdentity && _contentLength !== null;

        // Original XHR behaviour; in TM it equals to `contentLength`, or `-1` if `contentLength` is `null` (and `0`?).
        const total = lengthComputable ? contentLength : 0;
        const gmTotal = contentLength > 0 ? contentLength : -1; // Like `total` is in TM and GM.

        return {
            gmTotal, total, lengthComputable,
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
        if (fetchInit.extra?.webContext) {
            delete fetchInit.extra;
            return fetch(url, fetchInit);
        }

        function handleParams(fetchInit) {
            const defaultFetchInit = {method: "GET", headers: {}};
            const defaultExtra = {useStream: true, onprogress: null};
            const opts = {
                ...defaultFetchInit,
                ...fetchInit,
                extra: {
                    ...defaultExtra,
                    ...fetchInit.extra
                }
            };

            const {headers, method, body, referrer, signal, extra: {useStream, onprogress}} = opts;
            delete opts.extra.useStream;
            delete opts.extra.onprogress;

            const _headers = new HeadersLike(headers);
            if (referrer && !_headers.has("referer")) {
                _headers.append("referer", referrer); // todo: handle referrer
            }

            return {
                method, headers: _headers, body, signal,
                useStream, onprogress, extra: opts.extra
            };
        }

        const {
            method, headers, body, signal,
            useStream, onprogress, extra
        } = handleParams(fetchInit);

        let abortCallback;
        let done = false;
        function handleAbort(gmAbort) {
            if (!signal) {
                return;
            }
            if (signal.aborted) {
                gmAbort();
                const id = setInterval(() => done ? clearInterval(id) : gmAbort(), 1); // VM fix.
                return;
            }
            abortCallback = () => gmAbort();
            signal.addEventListener("abort", abortCallback);
        }
        function onDone() {
            signal?.removeEventListener("abort", abortCallback);
            done = true;
        }

        const HEADERS_RECEIVED = 2;
        const DONE = 4;
        function getOnReadyStateChange({onHeadersReceived}) {
            return function onReadyStatechange(gmResponse) {
                const {readyState} = gmResponse;
                if (readyState === HEADERS_RECEIVED) {
                    onHeadersReceived(gmResponse);
                }
                // It does not trigger on `abort` and `error`, while native XHR does. (In both TM and VM)
                // Fires only on `onload`. Is a bug? // Also it fires (`readyState === DONE`) multiple times in non the latest VM beta.
                // else if (readyState === DONE) {
                //     onDone();
                // }
            }
        }

        function getOnCancel(reject) {
            return {
                onerror(gmResponse) {
                    onDone();
                    reject(new TypeError("Failed to fetch"));
                },
                onabort() {
                    onDone();
                    reject(new DOMException("The user aborted a request.", "AbortError"));
                },
            };
        }

        function nonStreamFetch() {
            const _onprogress = onprogress;
            let onProgressProps = {}; // Will be inited on HEADERS_RECEIVED. It used to have the same behaviour in TM and VM.
            return new Promise((resolve, _reject) => {
                const onreadystatechange = getOnReadyStateChange({onHeadersReceived});
                const blobPromise = new Promise((resolve, reject) => {
                    const {onabort, onerror} = getOnCancel(reject);
                    const {abort} = GM_XHR({
                        ...extra,
                        url,
                        method,
                        headers,
                        responseType: "blob",
                        onload(gmResponse) {
                            onDone();
                            resolve(gmResponse.response);
                        },
                        onreadystatechange,
                        onprogress: _onprogress ? ({loaded/*, total, lengthComputable*/}) => {
                            _onprogress({loaded, ...onProgressProps});
                        } : undefined,
                        onerror,
                        onabort,
                        data: body,
                    });
                    handleAbort(abort);
                });
                blobPromise.catch(_reject);
                function onHeadersReceived(gmResponse) {
                    const {responseHeaders, status, statusText, finalUrl} = gmResponse;
                    const headers = parseHeaders(responseHeaders);
                    const response = new ResponseLike(blobPromise, {
                        headers, status, statusText, url, finalUrl
                    });
                    onProgressProps = getOnProgressProps(response);
                    resolve(response);
                }
            });
        }

        function streamFetch() {
            return new Promise((resolve, reject) => {
                const onreadystatechange = getOnReadyStateChange({onHeadersReceived});
                const {onabort, onerror} = getOnCancel(reject);
                const {abort} = GM_XHR({
                    ...extra,
                    url,
                    method,
                    headers,
                    responseType: "stream",
                    /* fetch: true, */ // Not required, since it already has `responseType: "stream"`.
                    onload(gmResponse) {
                        onDone();
                    },
                    onreadystatechange,
                    onerror,
                    onabort,
                    data: body,
                });
                handleAbort(abort);
                function onHeadersReceived(gmResponse) {
                    const {
                        responseHeaders, status, statusText, finalUrl, response: readableStream
                    } = gmResponse;
                    const headers = parseHeaders(responseHeaders);
                    const redirected = url !== finalUrl;
                    let response = new ResponseEx(readableStream, {headers, status, statusText, url, redirected});
                    if (onprogress) {
                        response = responseProgressProxy(response, onprogress);
                    }
                    resolve(response);
                }
            });
        }

        if (!isStreamSupported || !useStream) {
            return nonStreamFetch();
        } else {
            return streamFetch();
        }
    }

    GM_fetch.isStreamSupported = isStreamSupported;
    GM_fetch.webContextFetch = fetch;

    return GM_fetch;
}
