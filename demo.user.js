// ==UserScript==
// @name         GM_fetch demo (05.26)
// @description  GM_fetch demo. Just open https://example.com/gm_fetch-demo page to execute this demo.
// @version      0.1.13-2022.06.03
// @namespace    gh.alttiri
// @match        http*://example.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @connect      *
// @require      https://alttiri.github.io/gm_fetch/index.js
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
    <style>#demo div {padding: 15px 0; margin: 0;} input[type="text"] {width: 90%;}</style>
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
                body: new Blob(["xxx"]),
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
            console.log("fetching:", url);
            const request = new Request(url, {method: "head"});
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
