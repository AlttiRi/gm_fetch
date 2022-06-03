// ==UserScript==
// @name         GM_fetch dev demo (06.03)
// @description  GM_fetch demo + GM_fetch code. For dev purpose.
// @version      0.1.14-2022.06.03
// @namespace    gh.alttiri
// @match        http*://example.com/gm_fetch-demo-dev
// @match        https://twitter.com/gm_fetch-demo-dev
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// ==/UserScript==

demo();
function demo() {
    const GM_fetch = getGM_fetch();         // Just "import" it to use it
    const fetch = GM_fetch.webContextFetch; // Default `fetch` from web page context

    const defaultUrl = new URL(location).searchParams.get("url") || location.href;
    const onlyMainDemo = new URL(location).searchParams.get("only-main-demo");
    const noDl = new URL(location).searchParams.get("no-dl");
    let url = defaultUrl;

    // url = "http://ipv4.download.thinkbroadband.com/10MB.zip?t=" + Date.now(); // 408 // error
    // url = "https://giant.gfycat.com/ShockedSecondaryFiddlercrab.mp4";         // 200 // 32 MB
    // url = "https://example.com/404";                                          // 404
    // url = "https://example.com/";    // 200
    // url = "https://google.com/";     // .redirected, .url
    // url = "http://192.168.1.33:8080/1.mp4";

    const html = `
<div style="display: flex; justify-content: center; flex-direction: column;" id="demo">
    <style>#demo div {padding: 15px 0; max-width: 720px; margin: 0 auto;} input[type="text"] {width: 90%; min-width: 320px;}</style>
    <div>
        <span><label>URL: <input id="url-input" type="text" placeholder="${defaultUrl}" list="urls"></label></span>
        <datalist id="urls">
          <option value="http://192.168.1.33:8080/1.mp4"></option>
          <option value="https://example.com/"></option>
          <option value="https://example.com/404"></option>
          <option value="https://google.com/"></option>
          <option value="https://giant.gfycat.com/ShockedSecondaryFiddlercrab.mp4"></option>
          <option value="http://ipv4.download.thinkbroadband.com/10MB.zip?t=${Date.now()}"></option>
        </datalist>
    </div>
    <div>
        <div>
            <label><input type="checkbox" id="use-stream" checked title="Use streaming if supported">useStream</label>
        </div>
        <div id="fetch-type-radio-group">
            <label><input type="radio" name="fetch-type" value="GM_fetch" checked>GM_fetch</label>
            <br>
            <label><input type="radio" name="fetch-type" value="fetch">fetch</label>
        </div>
        <style>button {padding: 5px; margin: 5px;}</style>
        <style>.demos {display: ${onlyMainDemo ? "none;" : "auto;"}} .main-demo {display: ${onlyMainDemo ? "auto;" : "none;"}}</style>
        <div class="demos">
            ReadableStream demos<br>
            <button id="demo-1" title="Should throw: 'TypeError: body stream already read'">Demo 1</button>
            <button id="demo-2" title="Should throw: 'TypeError: body stream is locked'">Demo 2</button>
            <button id="demo-3" title="Should throw: 'This readable stream reader has been released and cannot be used to read from its previous owner stream'">Demo 3</button>
            <button id="demo-4" title="Should throw: 'TypeError: body stream already read'">Demo 4</button>
            <button id="demo-5" title="Should log readed with \`reader.read()\` bytes lenght">Demo 5</button>
            <button id="demo-6" title="Should log blob size">Demo 6</button>
        </div>
        <div class="demos">
            Demos<br>
            <button id="demo-X0" title="Should dowbload with StreamSaver. May not work in Firefox.">0. Download with StreamSaver</button>
            <br>
            <button id="demo-X1" title="Should dowbload a file from the URL">1. Download Blob</button>
            <button id="demo-X2" title="Should send request with additional headers">2. Headers</button>
            <button id="demo-X3" title="Should send Blob with 'xxx' text">3. Send Blob</button>
            <button id="demo-X4" title="Should abort fetch">4. Abort</button>
            <button id="demo-X5" title="Using of Request">5. Request input</button>
        </div>
        <div class="main-demo">
            <button id="main-demo" title="Should dowbload a file from the URL">Download Blob</button>
        </div>
    </div>
</div>
`;
    document.querySelector("body").insertAdjacentHTML("afterbegin", html);
    const run = func => {
        return async (event) => {
            const btn = event.currentTarget;
            btn.disabled = true;
            const start = Date.now();
            try {
                await func();
            } finally {
                btn.disabled = false;
                console.log(`Time: ${Date.now() - start} ms`);
            }
        }
    }
    let selectedFetch = GM_fetch;
    let useStream = true;
    document.querySelector("#url-input").addEventListener("input", event => {
        url = event.target.value;
    });
    document.querySelector("#fetch-type-radio-group").addEventListener("change", event => {
        if (event.target.value === "GM_fetch") {
            selectedFetch = GM_fetch;
        } else if (event.target.value === "fetch") {
            selectedFetch = fetch;
        }
    });
    document.querySelector("#use-stream").addEventListener("change", event => {
        useStream = event.currentTarget.checked;
    });
    const {demo1, demo2, demo3, demo4, demo5, demo6} = getStreamDemos();
    document.querySelector("#demo-1").addEventListener("click", run(demo1));
    document.querySelector("#demo-2").addEventListener("click", run(demo2));
    document.querySelector("#demo-3").addEventListener("click", run(demo3));
    document.querySelector("#demo-4").addEventListener("click", run(demo4));
    document.querySelector("#demo-5").addEventListener("click", run(demo5));
    document.querySelector("#demo-6").addEventListener("click", run(demo6));
    const {demoX1, demoX2, demoX3, demoX4, demoX5} = getDemos();
    document.querySelector("#main-demo").addEventListener("click", run(demoX1));
    document.querySelector("#demo-X1").addEventListener("click", run(demoX1));
    document.querySelector("#demo-X0").addEventListener("click", run(() => demoX1(true)));
    document.querySelector("#demo-X2").addEventListener("click", run(demoX2));
    document.querySelector("#demo-X3").addEventListener("click", run(demoX3));
    document.querySelector("#demo-X4").addEventListener("click", run(demoX4));
    document.querySelector("#demo-X5").addEventListener("click", run(demoX5));

    function getStreamDemos() {
        async function getProps() {
            console.log("---");
            let response = await selectedFetch(url, {
                extra: {
                    useStream
                }
            });
            let rs = response.body;
            let reader = rs.getReader();
            console.log({response, rs, reader});
            logLockProps({response, rs});
            console.log("---");

            return {response, rs, reader};
        }
        function logLockProps({response, rs}) {
            console.log({bodyUsed: response.bodyUsed, locked: rs.locked});
        }

        async function demo1(fetch) {
            let {response, rs, reader} = await getProps(fetch);

            console.log(await reader.read());
            logLockProps({response, rs});

            console.log(await reader.read());
            logLockProps({response, rs});

            console.log(await response.blob());
            logLockProps({response, rs});
        }
        async function demo2(fetch) {
            let {response, rs, reader} = await getProps(fetch);

            console.log(await response.blob());
            logLockProps({response, rs});
        }
        async function demo3(fetch) {
            let {response, rs, reader} = await getProps(fetch);

            reader.releaseLock();
            console.log({response, rs, reader});
            logLockProps({response, rs});

            console.log(await reader.read());
            logLockProps({response, rs});

            console.log(await reader.read());
            logLockProps({response, rs});

            console.log(await response.blob());
            logLockProps({response, rs});
        }
        async function demo4(fetch) {
            let {response, rs, reader} = await getProps(fetch);

            reader.releaseLock();
            reader = rs.getReader();
            console.log({response, rs, reader});
            logLockProps({response, rs});

            console.log(await reader.read());
            logLockProps({response, rs});

            console.log(await reader.read());
            logLockProps({response, rs});

            console.log(await response.blob());
            logLockProps({response, rs});
        }
        async function demo5(fetch, useStream) {
            let {response, rs, reader} = await getProps(fetch, useStream);

            reader.releaseLock();
            reader = rs.getReader();

            let value, done, total = 0;
            do {
                ({value, done} = await reader.read());
                if (!done) {
                    total += value.length;
                    // console.log({total, value});
                }
            } while (!done);
            console.log("reader.read() total:", total);
        }
        async function demo6(fetch, useStream) {
            let {response, rs, reader} = await getProps(fetch, useStream);
            reader.releaseLock();
            const blob = await response.blob();
            console.log("response.blob() size:", blob.size);
        }

        return {
            demo1, demo2, demo3, demo4, demo5, demo6,
        };
    }
    function getDemos() {
        async function demoX1(useStreamSaver = false) {
            console.log("fetching:", url);
            const response = await selectedFetch(url, {
                extra: {
                    useStream,
                    onprogress: props => console.log(props)
                }
            });
            console.log("response", response);

            const {status, statusText} = response;
            const lastModified = response.headers.get("last-modified");
            const contentType = response.headers.get("content-type");
            const contentLength = response.headers.get("content-length");
            console.log({status, statusText, lastModified, contentType, contentLength});

            if (useStreamSaver) {
                const ext = contentType.match(/(?<=\/)[^\/\s;]+/)?.[0] || "";
                const hostname = new URL(url).hostname;
                const filename = `[${hostname}] (GM_fetch demo)${ext ? "." + ext : ""}`;
                await saveWithStreamSaver(response.body, filename, contentLength);
                return;
            }

            const blob = await response.blob();
            console.log("blob.size", blob.size);

            if (noDl) {
                return;
            }
            const ext = contentType.match(/(?<=\/)[^\/\s;]+/)?.[0] || "";
            const hostname = new URL(url).hostname;
            downloadBlob(blob, `[${hostname}] (GM_fetch demo)${ext ? "." + ext : ""}`, url);
        }

        async function demoX2() {
            console.log("fetching:", url);
            const response = await selectedFetch(url, {
                referrer: "https://example.net/xxx-ref",
                headers: {
                    "xxx": "1"
                },
                extra: {
                    useStream: false
                }
            });
            console.log("response", response);
        }

        async function demoX3() {
            console.log("fetching:", url);
            const response = await selectedFetch(url, {
                method: "post",
                body: new Blob(["xxx"], {type: "text/plain"}),
                extra: {
                    useStream: false
                }
            });
            console.log("response", response);
        }

        async function demoX4() {
            console.log("fetching:", url);
            let controller = new AbortController();
            controller.abort();
            const response = await selectedFetch(url, {
                signal: controller.signal,
                extra: {
                    useStream: false
                }
            });
            console.log("response", response);
            console.log(await response.blob());
        }

        async function demoX5() {
            const request = new Request(url, {method: "head"});
            console.log("fetching:", url, request);
            const response = await selectedFetch(request, {
                extra: {
                    useStream: false
                }
            });
            console.log("response", response);
            console.log(await response.blob());
        }

        return {
            demoX1, demoX2, demoX3, demoX4, demoX5
        };
    }


    let loaded = false;
    async function saveWithStreamSaver(readableStream, filename, size) {
        if (!loaded) {
            await appendScript("https://jimmywarting.github.io/StreamSaver.js/StreamSaver.js")
            loaded = true;
        }
        const fileStream = streamSaver.createWriteStream(filename, {size});
        const writer = fileStream.getWriter();
        const reader = readableStream.getReader();
        const pump = () => reader.read()
            .then(res => res.done
                ? writer.close()
                : writer.write(res.value).then(pump));
        return pump();
    }

    function downloadBlob(blob, name, url = "") {
        const anchor = document.createElement("a");
        anchor.setAttribute("download", name || "");
        const blobUrl = URL.createObjectURL(blob);
        anchor.href = blobUrl + "#" + url;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
    }
    function appendScript(src, integrity) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.onload = resolve;
            script.onerror = event => reject({message: "Failed to load script", src, integrity, event});
            script.src = src;
            script.async = true;
            if (integrity) {
                script.integrity = integrity;
                script.crossOrigin = "anonymous";
            }
            document.body.append(script);
        });
    }
}

/*! GM_fetch — v0.3.5-2022.06.03-dev — https://github.com/AlttiRi/gm_fetch */
function getGM_fetch() {
    const GM_XHR = (typeof GM_xmlhttpRequest === "function") ? GM_xmlhttpRequest : (GM?.xmlHttpRequest);
    const isStreamSupported = GM_XHR?.RESPONSE_TYPE_STREAM;
    let firefoxFixedFetch = false;
    const fetch = getWebPageFetch();

    function getWebPageFetch() { // todo wrapper (onprogress)
        let fetch = globalThis.fetch;
        // [VM/GM/FM + Firefox with "Enhanced Tracking Protection" set to "Strict" (Or "Custom" with enabled "Fingerprinters" option)
        // on sites with CSP (like Twitter)] requires this fix.
        // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts
        function fixFirefoxFetchOnPageWithCSP() {
            const wrappedJSObject = globalThis.wrappedJSObject;
            const fixRequired = wrappedJSObject && typeof wrappedJSObject.fetch === "function";
            if (!fixRequired) {
                return;
            }
            function fixedFetch(resource, init = {}) { // todo if `Request` is passed
                if (init.headers instanceof Headers) {
                    // Since `Headers` are not allowed for structured cloning.
                    init.headers = Object.fromEntries(init.headers.entries());
                }
                delete init.extra; // Not supported currently // todo
                delete init.signal; // Can't be structured cloned // todo?
                return wrappedJSObject.fetch(cloneInto(resource, document), cloneInto(init, document, /*{cloneFunctions: true}*/));
            }
            fetch = fixedFetch;
            firefoxFixedFetch = true;
        }
        fixFirefoxFetchOnPageWithCSP();
        console.log({firefoxFixedFetch});
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
                        onload(gmResponse) { // todo getOnCancel
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
    GM_fetch.firefoxFixedFetch  = firefoxFixedFetch ;

    return GM_fetch;
}
