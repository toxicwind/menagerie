// menagerie hud — vision-fix: capture the visible tab and narrate via the HUD server
// Model: qwen3.6-35b (vision) routed by the menagerie server (/vision). Loop: 12s.
const SERVER = 'http://127.0.0.1:8734';

const PERSONAE = ['clippy', 'bonzi', 'links', 'rover', 'clippy', 'bonzi'];
let tick = 0;

async function captureAndNarrate() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab || !tab.id || tab.url?.startsWith('chrome') || tab.url?.startsWith('edge') || tab.url?.startsWith('about')) return;
    let dataUrl;
    try {
      dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    } catch {
      return; // no permission on this window (e.g. devtools) — skip silently
    }
    if (!dataUrl) return;
    const b64 = dataUrl.split(',')[1] || '';
    if (b64.length < 500) return;
    const persona = PERSONAE[tick++ % PERSONAE.length];
    const useLocate = tick % 2 === 1;
    const res = await fetch(`${SERVER}/${useLocate ? 'locate' : 'vision'}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ b64, note: `Current page: ${tab.title || ''}`, persona }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.said) chrome.runtime.sendMessage({ hud: true, op: 'vision', said: data.said, persona }).catch(() => {});
  } catch {
    /* offline server or transient — next tick */
  }
}

chrome.action.onClicked.addListener((tab) => {
  if (tab && tab.id !== undefined) chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('vision-fix', { periodInMinutes: 0.2 });
});
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === 'vision-fix') captureAndNarrate();
});
// also run once shortly after load
setTimeout(captureAndNarrate, 8000);