/**
 * menagerie lib — overlay /post protocol validation (pure).
 * The HUD server accepts {phase?, state?, bars?, event?}; bars entries are
 * {pct: 0-100, err?: boolean}. Used by overlay.mjs + tests.
 */
export function normalizeOverlayPayload(p) {
	if (!p || typeof p !== 'object') return null;
	const out = {};
	if (typeof p.phase === 'string') out.phase = p.phase.slice(0, 80);
	if (typeof p.state === 'string') out.state = p.state.slice(0, 200);
	if (typeof p.event === 'string') out.event = p.event.slice(0, 500);
	if (p.bars && typeof p.bars === 'object') {
		out.bars = {};
		for (const [k, v] of Object.entries(p.bars)) {
			if (!v || typeof v !== 'object') continue;
			const pct = Number(v.pct);
			if (Number.isFinite(pct)) out.bars[k] = { pct: Math.min(100, Math.max(0, pct)), err: !!v.err };
		}
	}
	return Object.keys(out).length ? out : null;
}
