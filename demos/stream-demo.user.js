// ==UserScript==
// @name         GM_fetch stream demo (05.26)
// @description  GM_fetch stream demo. Just open https://example.com/gm_fetch-stream-demo page to execute this demo.
// @version      0.0.2-2022.05.26
// @namespace    gh.alttiri
// @match        https://example.com/gm_fetch-stream-demo
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @connect      example.com
// @require      https://alttiri.github.io/gm_fetch/index.js
// ==/UserScript==

const GM_fetch = getGM_fetch();

//void demo2(GM_fetch);
//void demo3(GM_fetch);
//void demo4(GM_fetch);
void demo5(GM_fetch);

async function getProps(fetch) {
    console.log("---");
    let response = await fetch("./");
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

async function demo2(fetch) {
    let {response, rs, reader} = await getProps(fetch);

    console.log(await reader.read());
    logLockProps({response, rs});

    console.log(await reader.read());
    logLockProps({response, rs});

    console.log(await response.blob());
    logLockProps({response, rs});
}
async function demo3(fetch) {
    let {response, rs, reader} = await getProps(fetch);
  
    console.log(await response.blob());
    logLockProps({response, rs});
}
async function demo4(fetch) {
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
async function demo5(fetch) {
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
