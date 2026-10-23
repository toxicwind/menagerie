#!/usr/bin/env bun
// overlay-demo — synthetic session-move for the glass HUD: graders the overlay
// with phases, arrow progress bars and event ticks so you can SEE it dance.
// Usage: bun scripts/overlay-demo.mjs [--port 8734] [--seconds 20]
import gradient from 'gradient-string';
import { success } from 'log-symbols';

const port = Number(process.argv.find((a) => a.startsWith('--port='))?.slice(7)) || 8734;
const total = Number(process.argv.find((a) => a.startsWith('--seconds='))?.slice(9)) || 20;
const post = (p) =>
	fetch(`http://127.0.0.1:${port}/post`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(p),
	}).catch(() => {});

console.log(gradient.pastel('▸ overlay-demo → http://127.0.0.1:' + port));

const events = [
	'connected to CDP 127.0.0.1:9222',
	'loaded 385 cookies from firefox profile',
	'decoded 406 localStorage keys / 66 origins',
	'injected cookie <b>user_session</b>',
	'replayed origin <b>github.com</b> (41 keys)',
	'replayed origin <b>accounts.google.com</b> (23 keys)',
	'slots: race-2 route active · p95 405ms',
	'verify · cookie-present',
];
await post({ phase: 'booting', state: 'starting' });
await new Promise((r) => setTimeout(r, 600));

const phases = [
	['connect · CDP', 'cookies', 385],
	['cookies · firefox→chrome', 'cookies', 385],
	['localStorage · origins', 'localStorage', 66],
	['verify · github.com', 'verify', 1],
];
for (let sec = 0; sec < total; sec++) {
	const p = Math.min(100, Math.round(((sec % (total / 2)) / (total / 2)) * 100));
	const phase = phases[Math.min(phases.length - 1, Math.floor((sec / total) * phases.length))];
	const bars = { [phase[1]]: { pct: p }, demo: { pct: Math.round((sec / total) * 100) } };
	await post({ phase: gradient.pastel(phase[0]), state: 'running', bars, event: events[sec % events.length] });
	await new Promise((r) => setTimeout(r, 1000));
}
await post({
	phase: 'done',
	state: 'complete',
	bars: { demo: { pct: 100 } },
	event: 'session move complete ' + success,
});
console.log(gradient.mind('demo complete — overlay stayed glassy ♥'));
