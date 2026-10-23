#!/usr/bin/env bun
// overlay-inject — aggressive in-page glass HUD (userscript style).
// Injects a floating glass panel DIRECTLY into the active page via CDP and
// registers it for every future navigation (Page.addScriptToEvaluateOnNewDocument)
// — the HUD rides along like a userscript, no separate tab.
// The panel listens on the overlay server's WebSocket (127.0.0.1:8734) so any
// pipeline (session-move, ublood flood, benches) can push state into the page.
// Usage: bun scripts/overlay-inject.mjs [--port 9222] [--hud 8734] [--demo]
import { readFileSync } from "node:fs";

const cdpPort = process.argv.find(a => a.startsWith("--port="))?.slice(7) || "9222";
const hudPort = process.argv.find(a => a.startsWith("--hud="))?.slice(6) || 8734;
const demo = process.argv.includes("--demo");

const INJECT = `
(() => {
  if (window.__clippyHud) return;
  const css = \`
    #glassHud{position:fixed;right:14px;bottom:14px;z-index:2147483647;width:340px;
      background:linear-gradient(160deg,rgba(16,20,28,.88),rgba(20,26,38,.82));
      backdrop-filter:blur(24px) saturate(140%);border:1px solid rgba(255,255,255,.12);
      border-radius:18px;padding:16px 18px;color:#e8ecf4;font:12px/1.5 'SF Mono',ui-monospace,monospace;
      box-shadow:0 24px 70px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.08)}
    #glassHud h3{margin:0 0 8px;font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:#8b94a7}
    #glassHud .p{font-size:15px;font-weight:700;margin:2px 0 10px}
    #glassHud .p b{color:#6ee7b7}
    #glassHud .r{display:grid;gap:3px;margin:6px 0}
    #glassHud .l{display:flex;justify-content:space-between;color:#8b94a7;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em}
    #glassHud .b{height:7px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden}
    #glassHud .b i{display:block;height:100%;width:0%;border-radius:99px;background:linear-gradient(90deg,#34d399,#6ee7b7);box-shadow:0 0 12px rgba(110,231,183,.5);transition:width .35s}
    #glassHud .ev{color:#8b94a7;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}
    #glassHud .ev b{color:#6ee7b7}
    #glassHud:hover .ev{white-space:normal}
  \`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'glassHud';
  el.innerHTML = \`<h3>session-move · firefox→chrome</h3><div class="p"><b>▸</b> <span class="ph">connecting</span></div><div class="r"></div><div class="evl"></div>\`;
  document.body.appendChild(el);
  const ph = el.querySelector('.ph'), rows = el.querySelector('.r'), evl = el.querySelector('.evl');
  const bootClippy = async () => {
    if (window.clippy) return;
    try {
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'http://127.0.0.1:${hudPort}/clippy/build/clippy.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      window.clippy.load('Clippy', (agent) => {
        window.__agent = agent;
        agent.show();
        agent.moveTo(1200, 520);
        agent.play('Wave');
        agent.speak('Hi! I\\'m back. Watching the pipeline for you.');
      }, 'http://127.0.0.1:${hudPort}/clippy');
    } catch (e) { ph.textContent = 'clippy boot failed'; }
  };
  bootClippy();
  const talk = (txt) => {
    if (window.__agent) { try { window.__agent.speak(txt); } catch {} }
    try { const u = new SpeechSynthesisUtterance(txt.replace(/<[^>]+>/g, '')); u.rate = 1.02; u.pitch = 1.15; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch {}
  };
  const render = (m) => {
    let s; try { s = JSON.parse(m.data); } catch { return; }
    if (s.phase) { ph.textContent = s.phase.replace(/.*▸ /, '') + (s.state ? ' · ' + s.state : ''); if (window.__agent) { try { window.__agent.play(s.state === 'complete' ? 'Congratulate' : 'Thinking'); } catch {} } }
    rows.textContent = '';
    for (const [k, v] of Object.entries(s.bars || {})) {
      const r = document.createElement('div'); r.className = 'r';
      r.innerHTML = '<div class="l"><span>' + k + '</span><span>' + Math.round(v.pct) + '%</span></div><div class="b"><i style="width:' + v.pct + '%"></i></div>';
      rows.appendChild(r);
    }
    if (s.event) { const e = document.createElement('div'); e.className = 'ev'; e.innerHTML = s.event; evl.prepend(e); while (evl.children.length > 5) evl.lastElementChild.remove(); talk(s.event.replace(/<[^>]+>/g, '')); }
  };
  const ws = new WebSocket('ws://127.0.0.1:${hudPort}/ws');
  ws.onmessage = render;
  ws.onopen = () => { ph.textContent = '◉ live'; };
  window.__clippyHud = true;
})();
`;

const targets = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json();
const page = targets.find(t => t.type === "page" && !t.url.startsWith("devtools://"));
if (!page) { console.error("no page target"); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const m = ++id; pending.set(m, { res, rej }); ws.send(JSON.stringify({ id: m, method, params })); });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("ws")); });

// inject now + on every future navigation (userscript behavior)
await send("Runtime.evaluate", { expression: INJECT, returnByValue: true });
await send("Page.enable");
await send("Page.addScriptToEvaluateOnNewDocument", { source: INJECT });
console.log("[overlay-inject] HUD injected into", page.url.slice(0, 60), "(rides navigations)");
ws.close();

if (demo) {
  const { default: spawn } = await import("node:child_process").then(m => m);
  const dem = spawn("bun", ["scripts/overlay-demo.mjs"], { stdio: "inherit" });
  await new Promise(r => dem.on("exit", r));
}