#!/usr/bin/env bun
// overlay — glass HUD server for the session-move / ublood pipelines.
// Serves the overlay at http://127.0.0.1:8734 and broadcasts state to both
// the browser WebSocket and the terminal (JSONL on stdout when --log).
// Usage: bun scripts/overlay.mjs [--port 8734]
const port = Number(process.argv.find((a) => a.startsWith('--port='))?.slice(7)) || 8734;

import { file } from 'bun';

const html = await Bun.file(new URL('../overlay.html', import.meta.url)).text();
const clippyRoot = new URL('../third_party/clippy.js/', import.meta.url);

const clients = new Set();
const server = Bun.serve({
	port,
	fetch(req, srv) {
		const url = new URL(req.url);
		if (url.pathname === '/') return new Response(html, { headers: { 'Content-Type': 'text/html' } });
		if (url.pathname === '/state') return new Response(JSON.stringify(state));
		if (url.pathname.startsWith('/clippy/')) {
			const rel = url.pathname.replace('/clippy/', '');
			const f = file(new URL(rel, clippyRoot));
			return f.exists().then((ok) => (ok ? new Response(f) : new Response('missing', { status: 404 })));
		}
		if (url.pathname === '/hud.crx') return new Response(Bun.file(new URL('../extensions/hud.crx', import.meta.url)));
		if (url.pathname === '/updates.xml') return new Response(Bun.file(new URL('../extensions/updates.xml', import.meta.url)));
		if (url.pathname === '/ws') {
			if (srv.upgrade(req)) return undefined;
			return new Response('upgrade failed', { status: 500 });
		}
		if (url.pathname === '/post' && req.method === 'POST') {
			return req.json().then((body) => {
				publish(body);
				return new Response('ok');
			});
		}
		return new Response('not found', { status: 404 });
	},
	websocket: {
		open(ws) {
			clients.add(ws);
			ws.send(JSON.stringify(state));
		},
		close(ws) {
			clients.delete(ws);
		},
	},
});

let state = { phase: 'booting', state: 'starting', bars: {}, event: null };
function publish(next) {
	state = { ...state, ...next, event: next.event || null };
	const msg = JSON.stringify(state);
	for (const c of clients) {
		try {
			c.send(msg);
		} catch {}
	}
	if (process.argv.includes('--log')) console.log(msg);
}

export default {
	publish,
	state,
	// browser-post helper for other scripts: fetch(`http://127.0.0.1:${port}/post`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)})
	port,
};
console.error(`[overlay] glass HUD live at http://127.0.0.1:${port}`);
