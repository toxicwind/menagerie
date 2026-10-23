#!/usr/bin/env bun
// ublood-cdp — LLM-friendly filter flood via RAW Chrome DevTools Protocol.
// Full-JS route: Runtime.evaluate `.click()`/native-setter, no Puppeteer
// clickability checks. Works on any engine exposing --remote-debugging-port
// (Chrome/Edge). Restart the browser with:
//   --remote-debugging-port=9222 --load-extension=<ext grid>
// Usage: bun scripts/ublood-cdp.mjs [--port 9222] [--all]
import { readFileSync } from "node:fs";

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const PORT = arg("port", "9222");
const ALL = process.argv.includes("--all");
const LISTS = ALL
  ? [
      "https://raw.githubusercontent.com/yourduskquibbles/webannoyances/master/ultralist.txt",
      "https://raw.githubusercontent.com/yokoffing/filterlists/main/annoyance_list.txt",
      "https://raw.githubusercontent.com/yokoffing/filterlists/main/clean_reading_experience.txt",
      "https://raw.githubusercontent.com/yokoffing/filterlists/main/antipaywall_filters_without_element_hiding.txt",
    ]
  : [process.argv[2]].filter(Boolean);
if (LISTS.length === 0) { console.error("usage: bun scripts/ublood-cdp.mjs [<url>] [--all] [--port 9222]"); process.exit(1); }

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const t = targets.find(t => t.type === "page" && t.url.includes("dashboard")) || targets.find(t => t.type === "page");
if (!t) { console.error("no page target; open the uBO dashboard tab first"); process.exit(1); }
console.error(`[ublood-cdp] target: ${t.url}`);

const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  const mid = ++id;
  pending.set(mid, { res, rej });
  ws.send(JSON.stringify({ id: mid, method, params }));
});
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
};
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("ws error")); });
const evalJs = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;

for (const url of LISTS) {
  // scroll to bottom (custom section), set the URL via native setter + input event, click Add
  const out = await evalJs(`(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 800));
    const inp = document.querySelector('input[placeholder="URL of the filter list to add"]');
    if (!inp) return "no-url-input";
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(inp, ${JSON.stringify(url)});
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    const btn = [...document.querySelectorAll("button")].find(b => (b.innerText || "").trim() === "Add");
    if (!btn) return "no-add-btn";
    btn.click();
    await new Promise(r => setTimeout(r, 4000));
    const names = [...document.querySelectorAll(".listEntry .listName, .listEntries .listName")].map(e => e.innerText.trim());
    return names.slice(-8);
  })()`);
  console.log(url.split("/").pop(), "=>", JSON.stringify(out));
}
ws.close();
console.error("[ublood-cdp] done");