// ==UserScript==
// @name         GM_fetch demo
// @description  GM_fetch (a wrapper for GM_xmlhttpRequest) demonstration script. Just open https://example.com/gm_fetch-demo page to execute this demo.
// @version      0.0.1
// @namespace    gh.alttiri
// @match        https://example.com/gm_fetch-demo
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @connect      ipv4.download.thinkbroadband.com
// @connect      giant.gfycat.com
// @connect      example.com
// @connect      google.com
// ==/UserScript==


const GM_fetch = getGM_fetch();         // Just "import" it to use it
const fetch = GM_fetch.webContextFetch; // Default `fetch` from web page context


let url;
// url = "http://ipv4.download.thinkbroadband.com/10MB.zip?t=" + Date.now(); // 408 // error
 url = "https://giant.gfycat.com/ShockedSecondaryFiddlercrab.mp4";         // 200   // 32 MB
// url = "https://example.com/xxx";                                       // 404
//url = "https://example.com/"; // 200
// url = "https://google.com/";   // .redirected, .url


(async function demo() {
    console.log("GM_fetch:", url);
    let controller = new AbortController();
    //controller.abort();
    const response = await GM_fetch(url, {
        //method: "post",
        //body: new Blob(["xxx"]),
        referrer: "https://example.net",
        signal: controller.signal,
        extra: {
            useStream: false,
            onprogress: (props) => {console.log(props);}
        }
    });
    console.log(response);

    const {status, statusText} = response;
    const lastModified = response.headers.get("last-modified");
    const contentType = response.headers.get("content-type");
    console.log({status, statusText, lastModified, contentType});

    const blob = await response.blob();
    console.log(blob);

    const ext = contentType.match(/(?<=\/)[^\/\s;]+/)?.[0] || "";
    const hostname = new URL(url).hostname;
    downloadBlob(blob, `[${hostname}] (GM_fetch demo)${ext ? "." + ext : ""}`, url);
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
