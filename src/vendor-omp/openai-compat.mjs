/**
 * OpenAI-compatible endpoint resolution for menagerie.
 *
 * Order of priority:
 *   1. Explicit env: IMAGES_API_URL / IMAGES_API_KEY (or OPENAI_BASE_URL / OPENAI_API_KEY)
 *   2. The first provider block in ~/.omp/agent/models.yml, with the same
 *      value semantics omp uses (env-name-first, literal fallback — vendored
 *      from omp's resolve-config-value.ts), so `${SOME_VAR}`-style keys and
 *      bare env names resolve exactly like omp resolves them.
 *   3. null (caller decides the failure UX).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveConfigValueSync } from '../vendor-omp/resolve-config-value.mjs';

function ompModelsPath() {
	const home = process.env.USERPROFILE || process.env.HOME || '';
	return join(home, '.omp', 'agent', 'models.yml');
}

/** Minimal models.yml provider-block reader (first block with baseUrl+apiKey). */
function firstProviderFromOmpModels(text) {
	// Iterate top-level blocks: lines at column 0 are provider names, indented
	// lines are their properties. Capture the first block containing both.
	let current = null;
	let currentProps = {};
	for (const raw of text.split('\n')) {
		const line = raw.replace(/\s+$/, '');
		if (!line.trim() || line.trim().startsWith('#')) continue;
		const indent = line.length - line.trimStart().length;
		if (indent === 0 && !line.trim().startsWith('-')) {
			if (current && currentProps.baseUrl && currentProps.apiKey) break;
			current = line
				.trim()
				.replace(/[:#].*$/, '')
				.trim();
			currentProps = {};
			continue;
		}
		const m = line.trim().match(/^([A-Za-z0-9_]+):\s*(.*)$/);
		if (m && current) {
			const key = m[1];
			const value = m[2]
				.replace(/[#].*$/, '')
				.trim()
				.replace(/^["']|["']$/g, '');
			if (key === 'baseUrl' || key === 'apiKey' || key === 'api') {
				currentProps[key] = value;
			}
		}
	}
	if (!currentProps.baseUrl || !currentProps.apiKey) {
		// fallback: any indented baseUrl/apiKey pair anywhere in the file
		const anyBase = text.match(/^\s*baseUrl:\s*(\S+)/m);
		const anyKey = text.match(/^\s*apiKey:\s*(\S+)/m);
		if (anyBase && anyKey) return { baseUrl: anyBase[1], apiKey: anyKey[1] };
		return null;
	}
	return currentProps;
}

/** Resolve an OpenAI-compatible { baseUrl, apiKey } or null. */
export function resolveOpenAICompat() {
	const envUrl = process.env.IMAGES_API_URL || process.env.OPENAI_BASE_URL;
	const envKey = process.env.IMAGES_API_KEY || process.env.OPENAI_API_KEY;
	if (envUrl && envKey) return { baseUrl: envUrl, apiKey: envKey };

	const path = ompModelsPath();
	if (path && existsSync(path)) {
		try {
			const text = readFileSync(path, 'utf8');
			const provider = firstProviderFromOmpModels(text);
			if (provider) {
				return {
					baseUrl: resolveConfigValueSync(provider.baseUrl),
					apiKey: resolveConfigValueSync(provider.apiKey),
				};
			}
		} catch {
			/* fall through */
		}
	}
	return null;
}
