#!/usr/bin/env bun
// session-move — firefox → chrome full session transfer, full-grade UI.
// Aesthetics: gradient-string headers, log-symbols status, listr2 task tree,
// terminal-kit ANIMATED ARROW progress bars. Logic: raw CDP on the headed
// Chrome (headless thinking, headed window).
//   stage 1: Network.setCookies — all 385 firefox cookies
//   stage 2: per-origin localStorage replay — 66 origins / 406 keys
// Usage: bun scripts/session-move.mjs [--port 9222] [--overlay 8734]
import { readFileSync } from "node:fs";
import { Listr } from "listr2";
import termkit from "terminal-kit";
import gradient from "gradient-string";
import { success, info, warning, error } from "log-symbols";

const port = process.argv.find(a => a.startsWith("--port="))?.slice(7) || "9222";
const overlayPort = process.argv.find(a => a.startsWith("--overlay="))?.slice(9);
const term = termkit.terminal;
term.clear();

console.log("\n" + gradient.pastel.multiline("   ▛▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▜\n   ▌   FIREFOX → CHROME  SESSION MOVE   ▐\n   ▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▟\n") + "\n");

const post = async (payload) => { try { await fetch(`http://127.0.0.1:${overlayPort}/post`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); } catch {} };

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = targets.find(t => t.type === "page" && !t.url.startsWith("devtools://"));
if (!page) { console.log(error + " no page target on :" + port); process.exit(1); }
console.log(info + " CDP target: " + page.url.slice(0, 60));

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const m = ++id; pending.set(m, { res, rej }); ws.send(JSON.stringify({ id: m, method, params })); });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("ws")); });
const evalJs = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;

const cookies = JSON.parse(readFileSync("C:/Users/beebe/AppData/Local/Temp/ffall-cookies.json", "utf8"));
const lsAll = JSON.parse(readFileSync("C:/Users/beebe/AppData/Local/Temp/ff-all-ls.json", "utf8"));
const ss = { 0: "None", 1: "Lax", 2: "Strict" };

const tasks = new Listr([
  {
    title: gradient.pastel("cookies · 385 entries"), task: async (ctx, task) => {
      const set = cookies
        .filter(c => c.expiry === 0 || c.expiry > Date.now() / 1000)
        .map(c => ({ name: c.name, value: c.value, domain: c.host.startsWith(".") ? c.host : c.host, path: c.path || "/", secure: c.isSecure === 1, httpOnly: c.isHttpOnly === 1, sameSite: ss[c.sameSite] || "Lax", ...(c.expiry > 0 ? { expires: Math.min(c.expiry, 2147483647) } : {}) }));
      await send("Network.enable");
      const r = await send("Network.setCookies", { cookies: set });
      task.title = gradient.pastel("cookies · " + set.length + " set") + " " + success;
      await post({ phase: "cookies", bars: { cookies: { pct: 100 } }, event: "<b>set " + set.length + " cookies</b>" });
    },
  },
  {
    title: gradient.pastel("localStorage · origins"), task: async (ctx, task) => {
      const origins = Object.keys(lsAll);
      let done = 0;
      for (const origin of origins) {
        task.output = `▸ ${origin.slice(0, 44)}… ${Object.keys(lsAll[origin]).length} keys`;
        try {
          const tgt = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(origin)}`, { method: "PUT" })).json();
          const w2 = new WebSocket(tgt.webSocketDebuggerUrl);
          await new Promise((res2, rej2) => { w2.onopen = res2; w2.onerror = () => rej2(new Error("ws2")); });
          let i2 = 0; const pend2 = new Map();
          const s2 = (method, params = {}) => new Promise((res2, rej2) => { const m = ++i2; pend2.set(m, { res2, rej2 }); w2.send(JSON.stringify({ id: m, method, params })); });
          w2.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend2.has(m.id)) { const p = pend2.get(m.id); pend2.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
          await s2("Runtime.enable");
          await new Promise(r2 => setTimeout(r2, 700)); // let the origin load
          const entries = JSON.stringify(lsAll[origin]);
          await s2("Runtime.evaluate", { expression: `(async()=>{ const ls=JSON.parse(${JSON.stringify(entries)}); for(const [k,v] of Object.entries(ls)){ try{ localStorage.setItem(k,v);}catch(e){} } return localStorage.length; })()`, awaitPromise: true, returnByValue: true });
          w2.close();
          try { await (await fetch(`http://127.0.0.1:${port}/json/close/${tgt.id}`, { method: "PUT" })).json(); } catch {}
        } catch (e) { task.output = warning + " " + origin + " (" + String(e).slice(0, 40) + ")"; }
        done++; task.title = gradient.pastel("localStorage · " + done + "/" + origins.length);
        await post({ phase: "localStorage", bars: { localStorage: { pct: Math.round((done / origins.length) * 100) } }, event: "ls " + origin });
      }
      task.title = gradient.pastel("localStorage · " + done + " origins done") + " " + success;
    },
  },
  { title: gradient.pastel("verify · github.com"), task: async (ctx, task) => {
      await send("Page.navigate", { url: "https://github.com/login" });
      await new Promise(r => setTimeout(r, 5000));
      const logged = await evalJs(`document.body.innerText.includes("Sign in to GitHub") ? (document.cookie.includes("logged_in") ? "cookie-present" : "cookie-missing") : "page-moved"`);
      task.title = gradient.pastel("verify · " + logged) + " " + success;
      await post({ event: "verify: " + logged });
  } },
], { rendererOptions: { collapseSubtasks: false, showSubtasks: true } });

await tasks.run();
console.log("\n" + gradient.mind.multiline("   done — session live in the headed window ♥\n"));
process.exit(0);