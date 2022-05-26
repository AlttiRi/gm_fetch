// ==UserScript==
// @name         GM_fetch stream demo
// @description  GM_fetch stream demo. Just open https://example.com/gm_fetch-stream-demo page to execute this demo.
// @version      0.0.1
// @namespace    gh.alttiri
// @match        https://example.com/gm_fetch-stream-demo
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @connect      example.com
// ==/UserScript==

const GM_fetch = getGM_fetch();

//void demo2(GM_fetch);
//void demo3(GM_fetch);
//void demo4(GM_fetch);
void demo5(GM_fetch);

async function demo2(fetch) {
    let response = await fetch("./");
    let rs = response.body;
    let reader = rs.getReader();
    console.log({response, rs, reader});
    console.log(response.bodyUsed, rs.locked);
    console.log(await reader.read());
    console.log(response.bodyUsed, rs.locked);
    console.log(await reader.read());
    console.log(response.bodyUsed, rs.locked);
    console.log(await response.blob());
    console.log(response.bodyUsed, rs.locked);
}
async function demo3(fetch) {
    let response = await fetch("./");
    let rs = response.body;
    let reader = rs.getReader();
    console.log({response, rs, reader});
    console.log(response.bodyUsed, rs.locked);
    //console.log(await reader.read());
    console.log(response.bodyUsed, rs.locked);
    //console.log(await reader.read());
    console.log(response.bodyUsed, rs.locked);
    console.log(await response.blob());
    console.log(response.bodyUsed, rs.locked);
}
async function demo4(fetch) {
    let response = await fetch("./");
    let rs = response.body;
    let reader = rs.getReader();
    reader.releaseLock();
    console.log({response, rs, reader});
    console.log(response.bodyUsed, rs.locked);
    console.log(await reader.read());
    console.log(response.bodyUsed, rs.locked);
    console.log(await reader.read());
    console.log(response.bodyUsed, rs.locked);
    console.log(await response.blob());
    console.log(response.bodyUsed, rs.locked);
}
async function demo5(fetch) {
    let response = await fetch("./");
    let rs = response.body;
    let reader = rs.getReader();
    reader.releaseLock();
    reader = rs.getReader();
    console.log({response, rs, reader});
    console.log(response.bodyUsed, rs.locked);
    console.log(await reader.read());
    console.log(response.bodyUsed, rs.locked);
    console.log(await reader.read());
    console.log(response.bodyUsed, rs.locked);
    console.log(await response.blob());
    console.log(response.bodyUsed, rs.locked);
}
