// menagerie hud — zero-dependency version: static sprite cast + live WS state + vision balloons.
// No clippy runtime boot; the sprites are ALWAYS visible. Balloons hang off each sprite.
const q = (s) => document.querySelector(s);
const L = (m) => { (window.__mg ||= []).push(m); };

const barFor = (label, key) => {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<div class="lbl"><span>${label}</span><span class="pct">0%</span></div><div class="bar"><div class="fill" id="fill-${key}"></div></div>`;
  q('rows').appendChild(row);
  return row;
};

const ev = (txt) => {
  const d = document.createElement('div');
  d.className = 'ev';
  d.innerHTML = txt;
  q('events').prepend(d);
  while (q('events').children.length > 8) q('events').lastElementChild.remove();
};

const balloon = (who, txt) => {
  const host = document.getElementById('sprite-' + who);
  if (!host || !txt) return;
  let b = host.parentElement.querySelector('.mg-ball[data-who="' + who + '"]');
  if (!b) {
    b = document.createElement('div');
    b.className = 'mg-ball';
    b.setAttribute('data-who', who);
    document.body.appendChild(b);
  }
  const r = host.getBoundingClientRect();
  b.style.left = r.left + 'px';
  b.style.top = Math.max(10, r.top - 70) + 'px';
  b.textContent = txt;
  clearTimeout(b._t);
  b._t = setTimeout(() => (b.textContent = ''), 7000);
  L('balloon ' + who + ': ' + txt.slice(0, 40));
};

const PERSONAE = ['clippy', 'bonzi', 'links', 'rover', 'rowdy'];
let tick = 0;

try {
  const ws = new WebSocket('ws://127.0.0.1:8734/ws');
  ws.onmessage = (m) => {
    const s = JSON.parse(m.data);
    q('phase').textContent = s.phase || q('phase').textContent;
    q('state').textContent = s.state || '';
    for (const [k, v] of Object.entries(s.bars || {})) {
      let f = q('fill-' + k);
      if (!f) { barFor(k, k); f = q('fill-' + k); }
      f.style.width = v.pct + '%';
      f.closest('.row').querySelector('.pct').textContent = v.pct + '%';
      f.className = 'fill' + (v.err ? ' err' : '');
    }
    if (s.event) {
      ev(s.event);
      const clean = s.event.replace(/<[^>]+>/g, '').slice(0, 90);
      if (s.persona) balloon(s.persona === 'bonzi' ? 'bonzi' : s.persona === 'rowdy' ? 'rowdy' : 'clippy', clean);
      else balloon(PERSONAE[tick++ % 2] === 'bonzi' ? 'bonzi' : 'clippy', clean);
    }
    if (s.vision) {
      q('state').textContent = '👁 ' + s.vision;
    }
  };
  ws.onopen = () => {
    q('state').textContent = '◉ clippy + bonzi + rowdy live';
    L('ws-open');
  };
  ws.onerror = () => q('state').textContent = '◌ server offline — solo mode';
} catch (e) {
  q('state').textContent = '◌ solo mode';
}

setTimeout(() => {
  q('state').textContent = '◉ haunting this page';
  balloon('clippy', 'hello! i am haunting this page now');
  balloon('bonzi', 'OOOOH A PAGE');
}, 2500);
L('boot-complete');