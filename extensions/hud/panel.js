// menagerie hud — side panel: glass HUD + cast (cropped sprites) + vision narrations.
const q = (s) => document.querySelector(s);

function cropSprite(name, img, fallback = [124, 93]) {
  if (!img) return;
  fetch('clippy/agents/' + name + '/agent.js')
    .then((r) => r.text())
    .then((t) => {
      const m = t.match(/"framesize"\s*:\s*\[(\d+),\s*(\d+)\]/);
      if (m) fallback = [Number(m[1]), Number(m[2])];
    })
    .catch(() => {})
    .finally(() => {
      const src = new Image();
      src.onload = () => {
        const cols = Math.max(1, Math.floor(src.naturalWidth / fallback[0]));
        const cell = Number(localStorage.getItem('mg-cell') || 2);
        const x = Math.min(cell, cols - 1) * fallback[0];
        const c = document.createElement('canvas');
        c.width = fallback[0];
        c.height = fallback[1];
        c.getContext('2d').drawImage(src, x, 0, fallback[0], fallback[1], 0, 0, fallback[0], fallback[1]);
        img.src = c.toDataURL('image/png');
      };
      src.src = 'clippy/agents/' + name + '/map.png';
    });
}

(async () => {
  // cast: Clippy + Bonzi (cropped), Rowdy (single illustration)
  const cast = q('#cast');
  for (const [name, alt, fallback] of [
    ['Clippy', 'Clippy', [124, 93]],
    ['Bonzi', 'Bonzi', [124, 93]],
    ['rowdy', 'Rowdy', [170, 170]],
  ]) {
    const img = document.createElement('img');
    img.className = 'agent-sprite';
    img.alt = alt;
    img.src = 'clippy/agents/' + name + '/map.png';
    cast.appendChild(img);
    cropSprite(name, img, fallback);
  }

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
    while (q('events').children.length > 6) q('events').lastElementChild.remove();
  };
  const balloon = (txt) => {
    if (!txt) return;
    let b = document.querySelector('.mg-ball');
    if (!b) {
      b = document.createElement('div');
      b.className = 'mg-ball';
      b.style.left = '10px';
      document.body.appendChild(b);
    }
    b.style.top = Math.max(8, window.innerHeight - (q('#cast').offsetHeight || 280) - 70) + 'px';
    b.textContent = txt;
    clearTimeout(b._t);
    b._t = setTimeout(() => (b.textContent = ''), 6000);
  };

  try {
    const ws = new WebSocket('ws://127.0.0.1:8734/ws');
    ws.onmessage = (m) => {
      const s = JSON.parse(m.data);
      if (s.phase) q('#phase').textContent = s.phase;
      if (s.state) q('#state').textContent = s.state;
      for (const [k, v] of Object.entries(s.bars || {})) {
        let f = q('#fill-' + k);
        if (!f) { barFor(k, k); f = q('#fill-' + k); }
        f.style.width = v.pct + '%';
        f.closest('.row').querySelector('.pct').textContent = v.pct + '%';
        f.className = 'fill' + (v.err ? ' err' : '');
      }
      if (s.event) { ev(s.event); balloon(s.event.replace(/<[^>]+>/g, '').slice(0, 90)); }
      if (s.vision) { q('#state').textContent = '👁 ' + s.vision; balloon(s.vision.slice(0, 120)); }
    };
    ws.onopen = () => {
      q('#state').textContent = '◉ menagerie live';
      balloon('hello! i haunt the browser now');
    };
    ws.onerror = () => (q('#state').textContent = '◌ server offline');
  } catch {
    q('#state').textContent = '◌ solo mode';
  }
})();