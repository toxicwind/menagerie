#!/usr/bin/env bun
// vision-agent-loop — the paper-faithful GUI-agent loop (2026 literature):
//   Stage 1 (VERIFIABLE, single observation): PERCEIVE + GROUND — list text
//     verbatim, assign (x%,y%) centers on a 100x100 grid, type every element,
//     decide the next action (Set-of-Mark style, MolmoWeb grounding).
//   Stage 2 (EFR — Evidence-First Reflection, arXiv:2608.24015): a SEPARATE
//     prompt over before/after screens: list ONLY what changed. Never collapse
//     change-detection into stage-1 perception (VeriCUA arXiv:2610.26469:
//     prompted judges plateau at ~70%; FocusGUI 2610.26203: keep perception
//     action-sufficient to avoid sequential distraction).
// Usage:
//   bun scripts/vision-agent-loop.mjs --before a.webp --after b.webp \
//       [--model qwen3.6-35b] [--key $FREEINFERENCE_API_KEY]
const args = process.argv;
const get = (k, d) => {
	const i = args.indexOf(k);
	return i > 0 ? args[i + 1] : d;
};
const model = get('--model', 'qwen3.6-35b');
const KEY = process.env.FREEINFERENCE_API_KEY;
if (!KEY) {
	console.error('FREEINFERENCE_API_KEY not set');
	process.exit(1);
}
const before = get('--before'),
	after = get('--after');

const P_PERCEIVE = `You are a GUI agent viewing ONE screenshot as a 100x100 grid.
PERCEIVE: list all visible text verbatim.
GROUND: for each interactive element give center coordinates (x%,y%) and type (input/button/link).
VERIFY: does a login form exist? If yes state exact field labels and click/type coordinates to submit.
Reply as compact JSON {"elements":[{"text","center","type"}],"login_form":bool,"action":"..."}`;

const P_DIFF = `Evidence-First Reflection, stage 2.
Two screenshots of the same page BEFORE and AFTER one action.
Diff them: list ONLY what actually changed — new fields, error/banner text, navigation, or "NO_CHANGE".
One bullet per change. Do not describe either screen independently.`;

const img = (path) =>
	`data:image/${path.endsWith('.webp') ? 'webp' : 'png'};base64,${Bun.file(path)
		.arrayBuffer()
		.then((b) => Buffer.from(b).toString('base64'))}`;

async function call(prompt, images) {
	const t0 = Date.now();
	for (;;) {
		const res = await fetch('https://freeinference.org/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: 'Bearer ' + KEY,
				'Content-Type': 'application/json',
				'X-Reasoning-Passthrough': 'false',
			},
			body: JSON.stringify({
				model,
				max_tokens: 500,
				messages: [
					{
						role: 'user',
						content: [
							{ type: 'text', text: prompt },
							...images.map((u) => ({ type: 'image_url', image_url: { url: u } })),
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
			ms: Date.now() - t0,
			out: String(j.choices?.[0]?.message?.content || j.error?.message || '').replace(/\s+/g, ' '),
		};
	}
}

console.error(`[vision-agent-loop] model=${model} before=${before} after=${after}`);
if (before) {
	const s1 = await call(P_PERCEIVE, [await img(before)]);
	console.log(JSON.stringify({ stage: 1, ...s1 }));
}
if (after) {
	const s2 = await call(P_DIFF, [await img(after)]);
	console.log(JSON.stringify({ stage: 2, ...s2 }));
}
