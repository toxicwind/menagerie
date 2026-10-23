// menagerie hud — AUTONOMOUS reactive roaming: containers float, and steer toward what the agentic loop talks about.
// BANTER: the three cast members talk to each other — one speaker + one reactor per vision tick,
// styled balloons (per-persona border/glow, tail, typing dots), converging then drifting apart.
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

  // ==banter engine==
  // (inline copy of extensions/hud/banter.mjs body, minus `export`; drift-guarded by tests/banter.test.mjs)
const AGENTS = ['Clippy', 'Bonzi', 'Rowdy'];

const PERSONA = {
  Clippy: { color: '#4f9dff', glow: 'rgba(79,157,255,0.45)', tail: '#4f9dff' },
  Bonzi: { color: '#b06eff', glow: 'rgba(176,110,255,0.45)', tail: '#b06eff' },
  Rowdy: { color: '#d9a066', glow: 'rgba(217,160,102,0.45)', tail: '#d9a066' },
};

const NEUTRAL = { color: '#9aa7b8', glow: 'rgba(154,167,184,0.35)', tail: '#9aa7b8' };

const FALLBACK_LINES = {
  generic_reactions: ['huh?', 'look!', 'ok.', 'whoa.'],
};

function normalizeName(name) {
  const s = String(name == null ? '' : name).trim();
  if (!s) return 'Clippy';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function stripTags(txt) {
  return String(txt == null ? '' : txt).replace(/<[^>]+>/g, '').trim();
}

function textFromInput(input) {
  const src = input && (input.event || input.vision || input.text || input.what);
  return stripTags(src).slice(0, 110);
}

function personaStyle(name) {
  const key = normalizeName(name);
  const p = PERSONA[key] || NEUTRAL;
  return {
    name: key,
    color: p.color,
    glow: p.glow,
    tail: p.tail,
    border: '1px solid ' + p.color,
    css:
      'border:1px solid ' + p.color +
      ';box-shadow:0 0 16px ' + p.glow + ',0 4px 18px rgba(0,0,0,0.5)' +
      ';--mg-tail:' + p.tail + ';',
  };
}

function createBanter(lines) {
  const src = lines && typeof lines === 'object' ? lines : {};
  const openers = src.openers && typeof src.openers === 'object' ? src.openers : {};
  const reacts = src.reacts && typeof src.reacts === 'object' ? src.reacts : {};
  const generic =
    Array.isArray(src.generic_reactions) && src.generic_reactions.length
      ? src.generic_reactions
      : FALLBACK_LINES.generic_reactions;

  // deterministic round-robin line pickers (no Math.random -> reproducible turns)
  const counters = new Map();
  let cursor = -1;
  const history = [];

  const nextLine = (bank, key) => {
    const list = Array.isArray(bank) && bank.length ? bank : generic;
    const i = (counters.get(key) || 0) % list.length;
    counters.set(key, i + 1);
    return list[i];
  };

  // deterministic rotation: Clippy -> Bonzi -> Rowdy -> Clippy..., never the previous speaker
  const pickSpeaker = (prev) => {
    const start = (cursor + 1) % AGENTS.length;
    for (let k = 0; k < AGENTS.length; k += 1) {
      const idx = (start + k) % AGENTS.length;
      if (AGENTS[idx] !== prev) {
        cursor = idx;
        return AGENTS[idx];
      }
    }
    return AGENTS[start];
  };

  // reactor: the OTHER agent; alternates between the two non-speakers (rotation-wise)
  const pickReactor = (speaker, t) => {
    const cands = AGENTS.filter((a) => a !== speaker);
    return cands[t % cands.length];
  };

  const state = {
    tick: 0,
    lastSpeaker: null,
    lastReactor: null,
    history,
  };

  function tick(input) {
    const t = state.tick;
    state.tick += 1;
    const incoming = textFromInput(input);
    const speaker = pickSpeaker(state.lastSpeaker);
    const reactor = pickReactor(speaker, t);

    // every 3rd turn (1-based 3,6,9,..) the input prompts an OPENER from the bank
    const openerTurn = (t + 1) % 3 === 0;
    let role;
    let text;
    if (openerTurn) {
      role = 'opener';
      text = nextLine(openers[speaker], 'openers:' + speaker);
    } else if (incoming) {
      role = 'echo';
      text = incoming;
    } else {
      role = 'interject';
      text = nextLine(generic, 'interject:' + speaker);
    }

    // reaction reads from the directed pairing table; missing entries -> generic
    const pairKey = speaker + '->' + reactor;
    const reactText = nextLine(reacts[pairKey], 'reacts:' + pairKey);

    state.lastSpeaker = speaker;
    state.lastReactor = reactor;
    history.push({ tick: t, speaker, reactor });
    if (history.length > 24) history.shift();

    return {
      tick: t,
      speaker: { name: speaker, text, role },
      reactor: { name: reactor, text: reactText, role: 'react' },
    };
  }

  return { tick, state };
}
  // ==end banter engine==

  const style = document.createElement('style');
  style.textContent = `
    @keyframes mg-float { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(2deg); } }
    iframe[data-agent] { animation: mg-float 5.5s ease-in-out infinite; }

    .mg-ball {
      position: fixed; pointer-events: none; z-index: 2147483647;
      background: rgba(17,19,25,.93);
      border: 1px solid rgba(255,255,255,.28);
      border-radius: 14px;
      padding: 8px 13px;
      color: #f2f4f8;
      font: 600 13px/1.45 ui-sans-serif, system-ui, "Segoe UI", sans-serif;
      letter-spacing: .1px;
      max-width: 240px; width: max-content; white-space: normal;
      overflow-wrap: anywhere;
      opacity: 0;
      transform-origin: bottom center;
      transition: left 1.8s ease, top 1.8s ease, opacity .35s ease;
      -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
    }
    .mg-ball.mg-in { opacity: 1; animation: mg-pop .22s cubic-bezier(.2,.9,.3,1.35); }
    .mg-ball::after {
      content: ''; position: absolute; left: 22px; bottom: -8px;
      width: 0; height: 0;
      border: 8px solid transparent; border-top: 9px solid var(--mg-tail, rgba(255,255,255,.4)); border-bottom: 0;
    }
    @keyframes mg-pop { from { opacity: 0; transform: scale(.55) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    .mg-ball.mg-typing .mg-dot {
      display: inline-block; width: 6px; height: 6px; margin-right: 4px;
      border-radius: 50%; background: currentColor; opacity: .3;
      animation: mg-blink 1s infinite;
    }
    .mg-ball.mg-typing .mg-dot:nth-child(2) { animation-delay: .16s; }
    .mg-ball.mg-typing .mg-dot:nth-child(3) { animation-delay: .32s; }
    @keyframes mg-blink { 0%,60%,100% { opacity: .25; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
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

  const frameOf = (name) => frames.find((f) => f.slot.name.toLowerCase() === String(name).toLowerCase());

  // say(): renders ONE .mg-ball for an agent. opts.typing shows animated dots for ~700ms first.
  const say = (who, txt, opts = {}) => {
    const f = frameOf(who);
    if (!f || !f.ball || !txt) return;
    const p = personaStyle(who);
    const b = f.ball;
    const r = f.el.getBoundingClientRect();
    const bw = 240;
    b.style.left = Math.max(4, Math.min(innerWidth - bw - 4, r.left + f.slot.w / 2 - bw / 2)) + 'px';
    b.style.top = Math.max(2, r.top - 52) + 'px';
    b.style.borderColor = p.color;
    b.style.boxShadow = '0 0 16px ' + p.glow + ', 0 4px 18px rgba(0,0,0,.5)';
    b.style.setProperty('--mg-tail', p.tail);
    b.classList.remove('mg-in');
    void b.offsetWidth; // restart pop
    b.style.opacity = '1';
    b.classList.add('mg-in');
    clearTimeout(b._bt);
    const hide = () => { b.style.opacity = '0'; };
    const reveal = () => {
      b.classList.remove('mg-typing');
      b.textContent = txt;
      b._bt = setTimeout(hide, 5500);
    };
    if (opts.typing) {
      b.classList.add('mg-typing');
      b.textContent = '';
      const dots = document.createElement('span');
      dots.className = 'mg-dots';
      for (let i = 0; i < 3; i += 1) {
        const d = document.createElement('span');
        d.className = 'mg-dot';
        dots.appendChild(d);
      }
      b.appendChild(dots);
      clearTimeout(b._rt);
      b._rt = setTimeout(reveal, opts.delay || 700);
    } else {
      reveal();
    }
  };

  // dialogue choreography: speaker talks, reactor glides beside it while "typing", then they scatter.
  let scatterT = 0;
  const converge = (f, near) => {
    if (!f || !near || !near.at) return;
    place(f, near.at.x + near.slot.w + 16, near.at.y + Math.max(0, (near.slot.h - f.slot.h) / 2) - 4);
  };
  const sayTurn = (turn, steer) => {
    const sp = frameOf(turn.speaker.name);
    const rc = frameOf(turn.reactor.name);
    if (steer && typeof steer.x === 'number' && typeof steer.y === 'number' && sp) {
      place(sp, steer.x - sp.slot.w / 2, steer.y - sp.slot.h / 2);
    } else if (sp && Math.random() < 0.75) {
      goInterest(sp);
    }
    if (sp) say(sp.slot.name, turn.speaker.text);
    if (!rc) return;
    converge(rc, sp); // gentle glide: reactor comes to the speaker's side
    say(rc.slot.name, turn.reactor.text, { typing: true, delay: 700 });
    clearTimeout(scatterT);
    scatterT = setTimeout(() => { if (sp) goInterest(sp); if (rc) goInterest(rc); }, 6800);
  };

  // banter state machine: lines come from lines.json (web-accessible), generic fallback otherwise
  let banter = null;
  const loadLines = async () => {
    try {
      const res = await fetch(chrome.runtime.getURL('lines.json'));
      if (res.ok) {
        const data = await res.json();
        banter = createBanter(data);
        dbgLog('banter-lines');
        return;
      }
    } catch { /* fall through to fallback banks */ }
    banter = createBanter();
    dbgLog('banter-fallback');
  };
  loadLines();

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

  // transport: extension service worker relays WS (no PNA prompt from the page)
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || !msg.mg || !msg.payload) return;
    const s = msg.payload;
    if (!s) return;
    const steer = (typeof s.x === 'number' && typeof s.y === 'number') ? { x: s.x, y: s.y, what: s.what } : null;
    const input = {};
    if (s.event) {
      input.event = s.event + (steer ? ' 📍' + Math.round(s.x) + ',' + Math.round(s.y) : '');
    } else if (s.vision) {
      input.vision = s.vision;
    }
    if (!banter) { // engine still loading: skip rather than drop the cast's rhythm
      dbgLog('banter-pending');
      return;
    }
    sayTurn(banter.tick(input), steer);
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
    setTimeout(() => {
      if (banter) sayTurn(banter.tick({}));
      else say('Clippy', 'we roam now');
    }, 2600);
    setTimeout(autoLoop, 6000);
    // speak a greeting into the panel too
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
  const nav = () => setTimeout(inject, 800);
  window.addEventListener('pushState', nav);
  window.addEventListener('popstate', nav);
})();