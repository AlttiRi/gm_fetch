// ==UserScript==
// @name         GM_fetch stream demo (05.26)
// @description  GM_fetch stream demo. Just open https://example.com/gm_fetch-stream-demo page to execute this demo.
// @version      0.1.0-2022.05.31
// @namespace    gh.alttiri
// @match        http*://example.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @connect      *
// @require      https://alttiri.github.io/gm_fetch/index.js
// ==/UserScript==


// ------------------------------------------------------------------------------------
// Init
// ------------------------------------------------------------------------------------

const GM_fetch = getGM_fetch();         // Just "import" it to use it
const fetch = GM_fetch.webContextFetch; // Default `fetch` from web page context

// ------------------------------------------------------------------------------------
// Demo
// ------------------------------------------------------------------------------------

let url;
// url = "http://ipv4.download.thinkbroadband.com/10MB.zip?t=" + Date.now(); // 408 // error
// url = "https://giant.gfycat.com/ShockedSecondaryFiddlercrab.mp4";         // 200   // 32 MB
// url = "https://example.com/xxx";                                          // 404
// url = "https://example.com/";    // 200
// url = "https://google.com/";     // .redirected, .url
url = "http://192.168.1.33:8080/1.mp4";

let html = `
<div style="display: flex; justify-content: center; flex-direction: column;" id="demo">
    <style>#demo div {padding: 15px 0; margin: 0;} input[type="text"] {width: 90%;}</style>
    <div>
        <span><label>URL: <input id="url-input" type="text" value="${url}"></label></span>    
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
        <div>
            <style>button {padding: 5px; margin: 5px;}</style>
            <button id="demo-1">Demo 1</button>
            <button id="demo-2">Demo 2</button>
            <button id="demo-3">Demo 3</button>
            <button id="demo-4">Demo 4</button>
            <button id="demo-5">Demo 5</button>
            <button id="demo-6">Demo 6</button>
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
            btn.title = `Time: ${Date.now() - start} ms`;
            console.log(btn.title);
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
document.querySelector("#demo-1").addEventListener("click", run(demo1));
document.querySelector("#demo-2").addEventListener("click", run(demo2));
document.querySelector("#demo-3").addEventListener("click", run(demo3));
document.querySelector("#demo-4").addEventListener("click", run(demo4));
document.querySelector("#demo-5").addEventListener("click", run(demo5));
document.querySelector("#demo-6").addEventListener("click", run(demo6));


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
    console.log({total});
}
async function demo6(fetch, useStream) {
    let {response, rs, reader} = await getProps(fetch, useStream);
    reader.releaseLock();
    const blob = await response.blob();
    console.log(blob.size);
}
