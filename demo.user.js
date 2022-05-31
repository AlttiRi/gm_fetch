// ==UserScript==
// @name         GM_fetch demo (05.26)
// @description  GM_fetch demo. Just open https://example.com/gm_fetch-demo page to execute this demo.
// @version      0.1.7-2022.05.31
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

    const defaultUrl = location.href;
    let url = defaultUrl;
    // url = "http://ipv4.download.thinkbroadband.com/10MB.zip?t=" + Date.now(); // 408 // error
    // url = "https://giant.gfycat.com/ShockedSecondaryFiddlercrab.mp4";         // 200 // 32 MB
    // url = "https://example.com/404";                                          // 404
    // url = "https://example.com/";    // 200
    // url = "https://google.com/";     // .redirected, .url
    // url = "http://192.168.1.33:8080/1.mp4";

    let html = `
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
        <div>
            ReadableStream demos<br>
            <button id="demo-1" title="Should throw: 'TypeError: body stream already read'">Demo 1</button>
            <button id="demo-2" title="Should throw: 'TypeError: body stream is locked'">Demo 2</button>
            <button id="demo-3" title="Should throw: 'This readable stream reader has been released and cannot be used to read from its previous owner stream'">Demo 3</button>
            <button id="demo-4" title="Should throw: 'TypeError: body stream already read'">Demo 4</button>
            <button id="demo-5" title="Should log readed with \`reader.read()\` bytes lenght">Demo 5</button>
            <button id="demo-6" title="Should log blob size">Demo 6</button>
        </div>
        <div>
            Demos<br>
            <button id="demo-X1" title="Should dowbload a file from the URL">Demo 1</button>
            <button id="demo-X2" title="Should send request with additional headers">Demo 2</button>
            <button id="demo-X3" title="Should send Blob with 'xxx' text">Demo 3</button>
            <button id="demo-X4" title="Should abort fetch">Demo 4</button>
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
    const {demoX1, demoX2, demoX3, demoX4} = getDemos();
    document.querySelector("#demo-X1").addEventListener("click", run(demoX1));
    document.querySelector("#demo-X2").addEventListener("click", run(demoX2));
    document.querySelector("#demo-X3").addEventListener("click", run(demoX3));
    document.querySelector("#demo-X4").addEventListener("click", run(demoX4));

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
        async function demoX1() {
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
            console.log({status, statusText, lastModified, contentType});

            const blob = await response.blob();
            console.log("blob.size", blob.size);

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

        return {
            demoX1, demoX2, demoX3, demoX4
        };
    }

    function downloadBlob(blob, name, url = "") {
        const anchor = document.createElement("a");
        anchor.setAttribute("download", name || "");
        const blobUrl = URL.createObjectURL(blob);
        anchor.href = blobUrl + "#" + url;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
    }
}
