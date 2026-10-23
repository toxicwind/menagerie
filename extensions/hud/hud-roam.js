// menagerie hud — ROAMING cast: clippy.js runtime agents that wander + dance over the page.
const BASE = (clippy.BASE_PATH = chrome.runtime.getURL('clippy/agents/'));
const agents = [];
const ANIMS = ['Wave', 'GestureUp', 'GestureDown', 'Congratulate', 'SendMail', 'Alert', 'GetAttention'];

const grab = (r) =>
  r.text().then((t) => {
    const open = t.indexOf('{');
    const close = t.lastIndexOf('}');
    if (open < 0 || close <= open) return null;
    let raw = t.slice(open, close + 1);
    try { return JSON.parse(raw); }
    catch {
      try { return JSON.parse(raw.replace(/'/g, '"')); }
      catch { return null; }
    }
  });

const to = (pr, ms) => Promise.race([pr, new Promise((r) => setTimeout(() => r(null), ms))]);

async function preload(name) {
  const [a, s] = await Promise.all([
    to(fetch(BASE + name + '/agent.js').then(grab), 6000),
    to(fetch(BASE + name + '/sounds-mp3.js').then(grab), 6000),
  ]);
  if (a) clippy.ready(name, a.data);
  if (s) clippy.soundsReady(name, s.data);
  return !!(a && s);
}

function spawn(name, home) {
  return new Promise((resolve) => {
    preload(name).then(() => {
      let done = false;
      try {
        clippy.load(name, (agent) => {
          done = true;
          agent.show();
          const el = agent._el;
          if (el && el.css) {
            el.css({ position: 'fixed', zIndex: 2147483646, 'pointer-events': 'none', margin: 0, ...home });
            agents.push({ name, agent, el });
            // start it roaming
            wander({ name, agent, el });
          }
          resolve(true);
        });
      } catch { resolve(false); }
      setTimeout(() => { if (!done) resolve(false); }, 14000);
    });
  });
}

function wander(r) {
  const step = () => {
    if (!r.el || !r.el.css) return;
    const W = window.innerWidth, H = window.innerHeight;
    const w = 140, h = 140;
    const x = Math.random() * Math.max(10, W - w);
    const y = Math.random() * Math.max(10, H - h);
    const dur = 2500 + Math.random() * 3500;
    r.el.animate({ left: x + 'px', top: y + 'px' }, {
      duration: dur,
      easing: 'easeInOutQuad',
      complete: () => {
        try { r.agent.play(ANIMS[Math.floor(Math.random() * ANIMS.length)]); } catch {}
        setTimeout(step, 1600 + Math.random() * 2600);
      },
    });
  };
  setTimeout(step, 1200);
}

function say(r, txt) {
  if (!r || !txt) return;
  let b = document.querySelector('.mg-ball[data-who="' + r.name + '"]');
  if (!b) {
    b = document.createElement('div');
    b.className = 'mg-ball';
    b.setAttribute('data-who', r.name);
    document.body.appendChild(b);
  }
  const el = r.el && r.el[0] ? r.el[0] : null;
  if (el) {
    const rect = el.getBoundingClientRect();
    b.style.left = Math.max(2, rect.left) + 'px';
    b.style.top = Math.max(2, rect.top - 60) + 'px';
  }
  b.textContent = txt;
  clearTimeout(b._t);
  b._t = setTimeout(() => (b.textContent = ''), 6500);
}

(async () => {
  const started = await Promise.all([
    spawn('Clippy', { left: '20px', bottom: '20px' }),
    spawn('Bonzi', { right: '20px', bottom: '20px' }),
    spawn('rowdy', { left: '170px', bottom: '20px' }),
  ]);
  // vision/state feed -> roaming agents SPEAK and dance
  try {
    const ws = new WebSocket('ws://127.0.0.1:8734/ws');
    let tick = 0;
    ws.onmessage = (m) => {
      const s = JSON.parse(m.data);
      if (s.event) {
        const who = agents[tick++ % agents.length];
        const txt = s.event.replace(/<[^>]+>/g, '').slice(0, 100);
        say(who, txt);
        try { who.agent.play('Wave'); } catch {}
      }
      if (s.vision) {
        const who = agents[tick++ % agents.length];
        say(who, '👁 ' + s.vision.slice(0, 110));
      }
    };
    ws.onopen = () => {
      say(agents[0] || null, 'hello! we walk this page now');
      say(agents[1] || null, 'MOVING TIME');
    };
  } catch {}
})();