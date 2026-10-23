// menagerie hud — content script: mount the HUD iframe on every page
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