import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { resolveOpenAICompat } from '../vendor-omp/openai-compat.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Load .env from repo root if present. Never prints values. */
export function loadEnv() {
	config({ quiet: true, path: join(root, '.env') });
}

/** Require a key or fail with a clean message. */
export function requireKey(name) {
	const v = process.env[name];
	if (!v) {
		console.error(`menagerie: missing ${name} (copy .env.example to .env and fill it)`);
		process.exit(2);
	}
	return v;
}

/** True when running on Windows. */
export function isWindows() {
	return process.platform === 'win32';
}

/**
 * OpenAI-compatible endpoint: explicit env first, then the FIRST provider
 * block of ~/.omp/agent/models.yml using omp's own value semantics
 * (vendored resolver). Returns { baseUrl, apiKey } or null.
 */
export { resolveOpenAICompat };

/** forge convenience: baseUrl + apiKey or a clean exit. */
export function requireOpenAICompat() {
	const ep = resolveOpenAICompat();
	if (!ep) {
		console.error(
			'menagerie: no OpenAI-compatible endpoint found — set IMAGES_API_URL/IMAGES_API_KEY\n' +
				'  or point ~/.omp/agent/models.yml at an OpenAI-compatible provider (grab from omp).',
		);
		process.exit(2);
	}
	return ep;
}
