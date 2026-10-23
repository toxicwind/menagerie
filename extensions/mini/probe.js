(() => {
  const el = document.createElement('div');
  el.id = 'mini-probe';
  el.style.cssText = 'position:fixed;bottom:6px;left:6px;z-index:2147483647;background:#000;color:#0f0;font:10px monospace;padding:2px 6px';
  el.textContent = 'mini-probe-ALIVE';
  document.documentElement.appendChild(el);
})();
