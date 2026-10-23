// menagerie hud — mini agent frame: crop ONE sprite from ?agent=
const agent = new URLSearchParams(location.search).get('agent') || 'Clippy';
const box = document.getElementById('agent-box');

const fallback = agent === 'rowdy' ? [170, 170] : [124, 93];

fetch('clippy/agents/' + agent + '/agent.js')
  .then((r) => r.text())
  .then((t) => {
    const m = t.match(/"framesize"\s*:\s*\[(\d+),\s*(\d+)\]/);
    if (m) { fallback[0] = Number(m[1]); fallback[1] = Number(m[2]); }
  })
  .catch(() => {})
  .finally(() => {
    const img = new Image();
    img.onload = () => {
      const cols = Math.max(1, Math.floor(img.naturalWidth / fallback[0]));
      const cell = Number(localStorage.getItem('mg-cell') || 2);
      const x = Math.min(cell, cols - 1) * fallback[0];
      const c = document.createElement('canvas');
      c.width = fallback[0];
      c.height = fallback[1];
      c.getContext('2d').drawImage(img, x, 0, fallback[0], fallback[1], 0, 0, fallback[0], fallback[1]);
      const out = document.createElement('img');
      out.src = c.toDataURL('image/png');
      box.appendChild(out);
    };
    img.src = 'clippy/agents/' + agent + '/map.png';
  });