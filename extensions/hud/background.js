// menagerie hud — service worker: capture loop + WS transport hub (extension origin, no PNA prompt).
const SERVER = 'http://127.0.0.1:8734';
const PERSONAE = ['clippy', 'bonzi', 'links', 'rover', 'rowdy'];
let tick = 0;

function relay(s) {
  try {
    chrome.tabs.query({}, (tabs) => {
      for (const t of tabs) {
        if (t.id !== undefined) {
          chrome.tabs
            .sendMessage(t.id, { mg: true, payload: s })
            .catch(() => {});
        }
      }
    });
  } catch {
    /* no tabs yet */
  }
}

let ws = null;
function connect() {
  try {
    ws = new WebSocket('ws://127.0.0.1:8734/ws');
  } catch {
    return setTimeout(connect, 3000);
  }
  ws.onopen = () => relay({ phase: 'menagerie', event: 'menagerie connected' });
  ws.onclose = () => setTimeout(connect, 2000);
  ws.onerror = () => {
    try { ws.close(); } catch {}
  };
  ws.onmessage = (m) => {
    try {
      relay(JSON.parse(m.data));
    } catch {
      /* ignore non-json */
    }
  };
}

async function captureAndNarrate() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab || !tab.id || !tab.url || /^(chrome|edge|about|devtools):/.test(tab.url)) return;
    let dataUrl;
    try {
      dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    } catch {
      return;
    }
    if (!dataUrl) return;
    const b64 = dataUrl.split(',')[1] || '';
    if (b64.length < 500) return;
    const persona = PERSONAE[tick % PERSONAE.length];
    const useLocate = tick % 2 === 1;
    tick++;
    const res = await fetch(`${SERVER}/${useLocate ? 'locate' : 'vision'}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ b64, note: `Current page: ${tab.title || ''}`, persona }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (useLocate && data.x && data.y) {
      relay({ phase: 'vision', x: data.x, y: data.y, what: data.what, event: `📍 ${data.what || 'target'} @${Math.round(data.x)},${Math.round(data.y)}` });
    } else if (data.said) {
      relay({ phase: 'vision', vision: data.said });
    }
  } catch {
    /* offline server or transient */
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('vision-fix', { periodInMinutes: 0.2 });
  connect();
});
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === 'vision-fix') captureAndNarrate();
});
chrome.runtime.onStartup.addListener(() => connect());
setTimeout(captureAndNarrate, 8000);
connect();