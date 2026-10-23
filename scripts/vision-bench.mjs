#!/usr/bin/env bun
// vision-bench — image-question throughput benchmark across the vision-capable
// freeinference models at concurrency 1 (the gateway allows ~2 concurrent;
// one slot is usually the session itself). 429 → retry after 1s, endlessly.
// Usage: bun scripts/vision-bench.mjs <image-path> ["question"] [--runs 3]
import { readFileSync } from 'node:fs';

const img = process.argv[2];
const question = process.argv[3] || 'Describe this image in one sentence.';
const runs = Number(process.argv.find((a) => a.startsWith('--runs='))?.slice(7)) || 3;
const KEY = process.env.FREEINFERENCE_API_KEY;
if (!KEY) {
	console.error('FREEINFERENCE_API_KEY not set');
	process.exit(1);
}
const b64 = readFileSync(img).toString('base64');
const dataUrl = `data:image/${img.endsWith('.webp') ? 'webp' : 'png'};base64,${b64}`;
const models = ['glm-5.3-flash', 'minimax-m3', 'qwen3.6-35b'];

async function call(model, run) {
	let attempts = 0;
	const t0 = Date.now();
	for (;;) {
		attempts++;
		const res = await fetch('https://freeinference.org/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: 'Bearer ' + KEY,
				'Content-Type': 'application/json',
				'X-Reasoning-Passthrough': 'false',
			},
			body: JSON.stringify({
				model,
				max_tokens: 128,
				messages: [
					{
						role: 'user',
						content: [
							{ type: 'text', text: question },
							{ type: 'image_url', image_url: { url: dataUrl } },
						],
					},
				],
			}),
		});
		if (res.status === 429) {
			await Bun.sleep(1000);
			continue;
		}
		const j = await res.json();
		return {
			model,
			run,
			attempts,
			ms: Date.now() - t0,
			ans: String(j.choices?.[0]?.message?.content || j.error?.message || '')
				.replace(/\s+/g, ' ')
				.slice(0, 160),
		};
	}
}

const rows = [];
for (const m of models)
	for (let r = 1; r <= runs; r++) {
		const row = await call(m, r);
		rows.push(row);
		console.log(JSON.stringify(row));
	}
const agg = new Map();
for (const r of rows) {
	const a = agg.get(r.model) || { ms: [], fail: 0 };
	a.ms.push(r.ms);
	if (/429|error/i.test(r.ans)) a.fail++;
	agg.set(r.model, a);
}
console.log('\nmodel\tp50(ms)\tp95(ms)\tfastest\tfailures');
for (const [m, a] of agg) {
	const s = [...a.ms].sort((x, y) => x - y);
	const p50 = s[Math.floor(s.length / 2)],
		p95 = s[Math.floor(s.length * 0.95)] || s[s.length - 1];
	console.log(`${m}\t${p50}\t${p95}\t${s[0]}\t${a.fail}`);
}
await Bun.write('vision-bench.json', JSON.stringify(rows, null, 1));
