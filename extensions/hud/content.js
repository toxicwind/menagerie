// menagerie hud — AUTONOMOUS reactive roaming: containers float, and steer toward what the agentic loop talks about.
(() => {
  const dbg = document.createElement('div');
  dbg.id = 'mg-dbg';
  dbg.style.cssText = 'position:fixed;left:6px;top:6px;z-index:2147483647;background:#000;color:#0f0;font:9px monospace;padding:2px 4px;pointer-events:none;max-width:260px;word-break:break-all';
  const dbgLog = (m) => { dbg.textContent = m; };
  window.addEventListener('error', (e) => dbgLog('ERR ' + String(e.message).slice(0, 80)));
  dbgLog('boot');
  if (window.__menagerieHud) return;
  window.__menagerieHud = true;

  const CAST = [
    { name: 'Clippy', w: 130, h: 110 },
    { name: 'Bonzi', w: 130, h: 110 },
    { name: 'rowdy', w: 140, h: 120 },
  ];
  const frames = [];

  const style = document.createElement('style');
  style.textContent = `
    @keyframes mg-float { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(2deg); } }
    iframe[data-agent] { animation: mg-float 5.5s ease-in-out infinite; }
  `;
  (document.head || document.documentElement).appendChild(style);
  (document.body || document.documentElement).appendChild(dbg);

  const mount = (slot) => {
    try {
      const frame = document.createElement('iframe');
      frame.src = chrome.runtime.getURL('hud.html?agent=' + slot.name);
      frame.setAttribute('data-agent', slot.name);
      Object.assign(frame.style, {
        position: 'fixed', border: 'none', pointerEvents: 'none', zIndex: 2147483645,
        background: 'transparent', width: slot.w + 'px', height: slot.h + 'px',
        left: '0px', top: '0px', transition: 'left 4.5s ease, top 4.5s ease',
      });
      (document.body || document.documentElement).appendChild(frame);
      const ball = document.createElement('div');
      ball.className = 'mg-ball';
      ball.style.cssText =
        'position:fixed;pointer-events:none;z-index:2147483647;background:rgba(20,22,28,.94);border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:6px 10px;color:#e8eaf0;font:11px/1.4 ui-monospace,Consolas,monospace;white-space:nowrap;transition:left 3s ease,top 3s ease;opacity:0';
      (document.body || document.documentElement).appendChild(ball);
      frames.push({ el: frame, ball, slot });
    } catch { /* body not ready */ }
  };

  const place = (f, x, y) => {
    const w = f.slot.w, h = f.slot.h;
    f.el.style.left = Math.max(4, Math.min(innerWidth - w - 4, x)) + 'px';
    f.el.style.top = Math.max(4, Math.min(innerHeight - h - 4, y)) + 'px';
    f.at = { x: parseFloat(f.el.style.left), y: parseFloat(f.el.style.top) };
  };

  // agentic-reactive steering: find a page element the loop might care about
  const interests = () => {
    const cands = [
      ...document.querySelectorAll('h1, [role="alert"], [class*="error"], form, [role="main"], article'),
    ].filter((e) => e.offsetParent !== null && e.offsetWidth > 0);
    if (!cands.length) return null;
    const el = cands[Math.floor(Math.random() * cands.length)];
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, el };
  };

  const goRandom = (f) => {
    const x = Math.random() * innerWidth;
    const y = Math.random() * innerHeight;
    place(f, x, y);
  };

  const goInterest = (f) => {
    const it = interests();
    if (it) place(f, it.x - f.slot.w / 2, it.y - f.slot.h / 2);
    else goRandom(f);
  };

  // autonomy loop: drift interest → occasionally react to what the vision loop sees
  const autoLoop = () => {
    dbgLog('auto-tick ' + frames.length + ' at ' + Date.now() % 100000);
    for (const f of frames) {
      if (Math.random() < 0.6) goInterest(f);
      else goRandom(f);
    }
    setTimeout(autoLoop, 7000 + Math.random() * 4000);
  };

  const say = (who, txt) => {
    const f = frames.find((x) => x.slot.name === who) || frames[0];
    if (!f || !f.ball || !txt) return;
    const r = f.el.getBoundingClientRect();
    f.ball.style.left = Math.max(2, r.left - 20) + 'px';
    f.ball.style.top = Math.max(2, r.top - 34) + 'px';
    f.ball.style.opacity = '1';
    f.ball.textContent = txt;
    clearTimeout(f._bt);
    f._bt = setTimeout(() => (f.ball.style.opacity = '0'), 5500);
  };

  const burst = () => {
    const spots = [
      [16, 16],
      [innerWidth - 160, 16],
      [16, innerHeight - 140],
      [innerWidth - 160, innerHeight - 140],
      [innerWidth / 2 - 70, innerHeight / 2],
    ];
    frames.forEach((f, i) => {
      const s = spots[Math.floor(Math.random() * spots.length)];
      place(f, s[0], s[1]);
    });
  };

  // agentic feed: vision narrations steer the speaker toward the page's content
  const order = ['Clippy', 'Bonzi', 'rowdy'];
  let tick = 0;
  // transport: extension service worker relays WS (no PNA prompt from the page)
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || !msg.mg || !msg.payload) return;
    const s = msg.payload;
    if (s.event) {
      const who = order[tick++ % 3];
      const f = frames.find((x) => x.slot.name === who);
      if (typeof s.x === 'number' && typeof s.y === 'number') {
        if (f) place(f, s.x - f.slot.w / 2, s.y - f.slot.h / 2);
        say(who, '📍 ' + (s.what || 'there') + ' @' + Math.round(s.x) + ',' + Math.round(s.y));
      } else {
        if (f && Math.random() < 0.75) goInterest(f);
        say(who, s.event.replace(/<[^>]+>/g, '').slice(0, 90));
      }
    } else if (s.vision) {
      const who = order[tick++ % 3];
      say(who, '👁 ' + s.vision.slice(0, 110));
    }
  });
  dbgLog('transport-ready');

  const inject = () => {
    if (frames.length) return;
    CAST.forEach(mount);
    place(frames[0], 16, innerHeight - frames[0].slot.h - 16);
    place(frames[1], innerWidth - frames[1].slot.w - 16, innerHeight - frames[1].slot.h - 16);
    place(frames[2], 60, innerHeight * 0.35);
    dbgLog('inject-done ' + frames.length);
    (document.body || document.documentElement).appendChild(dbg);
    setTimeout(() => { tick('greet'); say('Clippy', 'we roam now'); }, 2500);
    setTimeout(autoLoop, 6000);
    // speak a greeting into the panel too
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
  const nav = () => setTimeout(inject, 800);
  window.addEventListener('pushState', nav);
  window.addEventListener('popstate', nav);
})();