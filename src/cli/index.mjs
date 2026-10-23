#!/usr/bin/env bun
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
/**
 * menagerie — CLI (citty-based, subcommands: move/hud/recon/rank/forge)
 * Cross-platform: Windows + Linux. Env-only secrets (env.mjs can also grab
 * an OpenAI-compatible endpoint from ~/.omp/agent/models.yml).
 *
 *   bun run cli -- move "context"         session-move
 *   bun run cli -- hud <url> [--agent a]  in-page HUD w/ agent cast
 *   bun run cli -- recon [route]          rate-limit gate recon
 *   bun run cli -- rank <owner/repo>      star-whore repo scoring
 *   bun run cli -- forge --prompt "..."   custom agent builder (OpenAI-compat image gen)
 */
import { defineCommand, runMain } from 'citty';
import { loadEnv } from './env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const script = (name) => join(root, 'scripts', name);

/** Thin runner: delegate to the battle-tested scripts/ modules. */
function delegate(name, scriptName) {
	return defineCommand({
		meta: { name, description: `run scripts/${scriptName}` },
		args: {
			_: { type: 'positional', description: 'script args' },
			agent: { type: 'string', description: 'agent name (hud)' },
			agents: { type: 'string', description: 'comma list for buddy mode (hud)' },
			shuffle: { type: 'boolean', description: 'random agent (hud)' },
			mute: { type: 'boolean', description: 'disable TTS (hud)' },
			prompt: { type: 'string', description: 'forge prompt' },
			grid: { type: 'string', description: 'forge sprite grid e.g. 4x4' },
			quiet: { type: 'boolean', description: 'suppress chatter' },
		},
		async run({ args }) {
			loadEnv();
			const file = script(scriptName);
			if (!existsSync(file)) {
				console.error(`menagerie: missing script ${file}`);
				process.exit(1);
			}
			const mod = await import(file).catch(() => null);
			if (mod && typeof mod.main === 'function') return mod.main(args);
			// Fallback: re-exec as a bun script with passthrough options
			const opts = [];
			for (const [flag, key] of [
				['--agent', args.agent],
				['--agents', args.agents],
				['--prompt', args.prompt],
				['--grid', args.grid],
			]) {
				if (args[key] !== undefined && args[key] !== null) opts.push(flag, args[key]);
			}
			if (args.shuffle) opts.push('--shuffle');
			if (args.mute) opts.push('--mute');
			if (args.quiet) opts.push('--quiet');
			const { spawnSync } = await import('node:child_process');
			const r = spawnSync(process.execPath, [file, ...opts, ...(args._ || [])], {
				stdio: 'inherit',
			});
			process.exit(r.status ?? 1);
		},
	});
}

runMain(
	defineCommand({
		meta: {
			name: 'menagerie',
			description: 'An automation age spirit-haunted by Clippy. Session ops + in-page HUD + gate recon + repo ranker.',
			version: '0.1.0',
		},
		subCommands: {
			move: delegate('move', 'session-move.mjs'),
			hud: delegate('hud', 'overlay-demo.mjs'),
			recon: delegate('recon', 'ratelimit-recon.mjs'),
			rank: delegate('rank', 'rank-repos.mjs'),
			forge: delegate('forge', 'agent-forge.mjs'),
		},
	}),
);
