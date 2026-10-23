#!/usr/bin/env bun
// Reasoning-effort audit: fixed verifiable task (Collatz 27), max_tokens at
// each model's ceiling, reasoning_effort swept omitted/low/high/max.
// 429 → retry after 1s, endlessly. Usage: bun run audit:reasoning
const conf = [
	{ model: 'glm-5.3-flash', mt: 131072 },
	{ model: 'minimax-m3', mt: 131072 },
	{ model: 'qwen3.6-35b', mt: 8192 },
	{ model: 'deepseek-v4-flash', mt: 393216 },
];
const efforts = [undefined, 'low', 'high', 'max'];
const prompt =
	'Collatz sequence from 27: repeatedly apply (odd: 3n+1, even: n/2). ' +
	'List the first 20 terms, then sum the even terms among those 20. ' +
	'Show your work and give the final sum as ANSWER=<number>.';
const KEY = process.env.FREEINFERENCE_API_KEY;
if (!KEY) {
	console.error('FREEINFERENCE_API_KEY not set');
	process.exit(1);
}

async function call(cfg, effort) {
	let attempts = 0;
	const t0 = Date.now();
	for (;;) {
		attempts++;
		const body = { model: cfg.model, messages: [{ role: 'user', content: prompt }], max_tokens: cfg.mt };
		if (effort !== undefined) body.reasoning_effort = effort;
		const res = await fetch('https://freeinference.org/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: 'Bearer ' + KEY,
				'Content-Type': 'application/json',
				'X-Reasoning-Passthrough': 'false',
			},
			body: JSON.stringify(body),
		});
		if (res.status === 429) {
			await Bun.sleep(1000);
			continue;
		}
		const j = await res.json();
		const content = j.choices?.[0]?.message?.content || '';
		const usage = j.usage || {};
		const words = content.split(/\s+/).filter(Boolean);
		const unique = new Set(words.map((w) => w.toLowerCase())).size;
		return {
			model: cfg.model,
			effort: String(effort),
			attempts,
			ms: Date.now() - t0,
			completion: usage.completion_tokens,
			total: usage.total_tokens,
			answer: (content.match(/ANSWER\s*=\s*\d+/i) || [])[0] || null,
			len: content.length,
			rep: +(1 - unique / words.length).toFixed(2),
			err: j.error?.message || null,
		};
	}
}

const rows = [];
for (const c of conf)
	for (const e of efforts) {
		const r = await call(c, e);
		rows.push(r);
		console.log(JSON.stringify(r));
	}
await Bun.write('reasoning-audit.json', JSON.stringify(rows, null, 1));
