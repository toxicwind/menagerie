// menagerie hud — content script: mount the HUD iframe + act on the page
(() => {
  if (window.__menagerieHud) return;
  window.__menagerieHud = true;

  const inject = () => {
    try {
      if (document.getElementById('menagerie-hud-frame')) return;
      const frame = document.createElement('iframe');
      frame.id = 'menagerie-hud-frame';
      frame.src = chrome.runtime.getURL('hud.html');
      Object.assign(frame.style, {
        position: 'fixed',
        inset: '0 auto auto 0',
        width: '100vw',
        height: '100vh',
        border: 'none',
        pointerEvents: 'none',
        zIndex: 2147483647,
        background: 'transparent',
      });
      (document.body || document.documentElement).appendChild(frame);
    } catch {
      /* body not ready */
    }
  };

  // ——— agentic: let the HUD read + act on this page ———
  const visibleText = (el) => (el && el.innerText ? el.innerText.trim().slice(0, 400) : '');
  const dismissBanners = () => {
    const selectors = [
      'button[aria-label="Dismiss"], button[aria-label="Close"], button[aria-label="dismiss"], .consent-banner button, [id*="cookie"] button, [class*="cookie"] button, [class*="consent"] button, [data-testid*="dismiss"]',
    ];
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        try { btn.click(); return 'dismissed: ' + sel.slice(0, 40); } catch { /* noop */ }
      }
    }
    return null;
  };
  const focusPrimaryInput = () => {
    const inputs = [...document.querySelectorAll('input[type="text"], input:not([type]), textarea, [contenteditable="true"], input[type="search"]')]
      .filter((i) => i.offsetParent !== null && i.offsetWidth > 0);
    if (!inputs.length) return null;
    const target = inputs[0];
    try { target.focus({ preventScroll: false }); target.scrollIntoView({ block: 'center' }); return 'focused: ' + (target.placeholder || target.name || 'input'); } catch { return null; }
  };
  const scrollToMain = () => {
    const main = document.querySelector('main, [role="main"], article, #content, .container-lg');
    if (main) { main.scrollIntoView({ behavior: 'smooth', block: 'start' }); return 'scrolled to main content'; }
    return null;
  };
  const snapshot = () => ({
    title: (document.title || '').slice(0, 90),
    url: location.href.slice(0, 90),
    heading: (document.querySelector('h1')?.innerText || '').slice(0, 90),
    text: visibleText(document.body).slice(0, 120),
    formCount: document.querySelectorAll('form').length,
    inputCount: document.querySelectorAll('input, textarea').length,
    links: document.querySelectorAll('a').length,
    errors: document.querySelectorAll('[role="alert"], .error, .warning, [class*="error"]').length,
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || msg.hud !== true) return;
    let res = null;
    try {
      switch (msg.op) {
        case 'pulse': res = snapshot(); break;
        case 'act-dismiss': res = dismissBanners(); break;
        case 'act-focus': res = focusPrimaryInput(); break;
        case 'act-scroll': res = scrollToMain(); break;
        case 'highlight': {
          const el = document.querySelector(msg.selector || 'h1');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const old = el.style.outline;
            el.style.outline = '3px solid #7d5cff';
            setTimeout(() => (el.style.outline = old), 1500);
            res = 'highlighted ' + (msg.selector || 'h1');
          } else res = null;
          break;
        }
      }
    } catch (e) { res = 'ERR:' + e.message.slice(0, 60); }
    sendResponse(res);
    return false;
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

  // ride navigation (SPA history + full loads)
  const nav = () => setTimeout(inject, 800);
  window.addEventListener('pushState', nav);
  window.addEventListener('popstate', nav);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setTimeout(inject, 500);
  });
})();