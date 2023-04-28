# GM_fetch

`GM_fetch` — a wrapper for `GM_xmlhttpRequest` of TamperMonkey and ViolentMonkey UserScript extensions.

`GM_fetch` is compatible with [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).

---

**Currently it is in development. So, it's not complited.** 

The more detail description will be later.

---

## Simple wrapper

Okay, if just you need a **simple** wraper, here is it:
```js
async function GM_fetch(url, {method = "get", headers} = {}) {
    return new Promise((resolve, _reject) => {
        const blobPromise = new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                url,
                method,
                headers,
                responseType: "blob",
                onload: response => resolve(response.response),
                onerror: reject,
                onreadystatechange: onHeadersReceived
            });
        });
        blobPromise.catch(_reject);
        function onHeadersReceived(response) {
            const {
                readyState, responseHeaders, status, statusText
            } = response;
            if (readyState === 2) { // HEADERS_RECEIVED
                const headers = parseHeaders(responseHeaders);
                resolve({
                    headers,
                    status,
                    statusText,
                    ok: status.toString().startsWith("2"),
                    arrayBuffer: () => blobPromise.then(blob => blob.arrayBuffer()),
                    blob: () => blobPromise,
                    json: () => blobPromise.then(blob => blob.text()).then(text => JSON.parse(text)),
                    text: () => blobPromise.then(blob => blob.text()),
                });
            }
        }
    });
}
function parseHeaders(headersString) {
    class Headers {
        get(key) {
            return this[key.toLowerCase()];
        }
    }
    const headers = new Headers();
    for (const line of headersString.trim().split("\n")) {
        const [key, ...valueParts] = line.split(":"); // last-modified: Fri, 21 May 2021 14:46:56 GMT
        headers[key.trim().toLowerCase()] = valueParts.join(":").trim();
    }
    return headers;
}
```

Demo for the simple wrapper:
```js
// ...
// @grant       GM_xmlhttpRequest
// ==/UserScript==

(async function demo() {
  const url = "https://i.imgur.com/2wD3VJA.jpg";
  const refererHeader = "https://imgur.com/";
  const response = await GM_fetch(url, {headers: {referer: refererHeader}});
  const {status, statusText, ok} = response;
  const lastModified = response.headers.get("last-modified");
  console.log(url, {status, statusText, ok, lastModified});

  const blob = await response.blob();
  const name = url.split("/").pop();
  downloadBlob(blob, name, url);
})();

function downloadBlob(blob, name, url) {
  const anchor = document.createElement("a");
  anchor.setAttribute("download", name || "");
  const blobUrl = URL.createObjectURL(blob);
  anchor.href = blobUrl + (url ? ("#" + url) : "");
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}

// ...
// async function GM_fetch(url, init = {}) {
// ...
```

---

- https://www.tampermonkey.net/documentation.php#GM_xmlhttpRequest
- https://violentmonkey.github.io/api/gm/#gm_xmlhttprequest
- https://wiki.greasespot.net/GM.xmlHttpRequest

---

- https://developer.mozilla.org/en-US/docs/Web/API/fetch
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy

