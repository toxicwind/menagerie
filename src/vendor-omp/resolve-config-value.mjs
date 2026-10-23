/**
 * Vendored from omp (oh-my-pi) — MIT License.
 * Copyright (c) 2025 Mario Zechner, Copyright (c) 2025-2026 Can Bölük
 * Source: packages/coding-agent/src/config/resolve-config-value.ts
 *
 * Resolve configuration values that may be shell commands, environment
 * variables, or literals:
 *   - starts with "!" → run the rest as a shell command, use stdout (cached)
 *   - otherwise → process.env[name] ?? literal
 */
import { execFileSync } from 'node:child_process';

const commandResultCache = new Map();
const commandInFlight = new Map();

function runShellCommand(command, timeoutMs = 10_000) {
	try {
		if (process.platform === 'win32') {
			return execFileSync('cmd.exe', ['/c', command], { encoding: 'utf8', timeout: timeoutMs }).trim();
		}
		return execFileSync('/bin/sh', ['-c', command], { encoding: 'utf8', timeout: timeoutMs }).trim();
	} catch {
		return undefined;
	}
}

async function executeCommand(commandConfig) {
	const cached = commandResultCache.get(commandConfig);
	if (cached !== undefined) return cached;
	const existing = commandInFlight.get(commandConfig);
	if (existing) return existing;
	const command = commandConfig.slice(1);
	const promise = runShellCommand(command, 10_000).then((result) => {
		if (result !== undefined) commandResultCache.set(commandConfig, result);
		return result;
	});
	commandInFlight.set(commandConfig, promise);
	try {
		return await promise;
	} finally {
		commandInFlight.delete(commandConfig);
	}
}

/** Resolve a config value (API key, header value, etc.) to an actual value. */
export async function resolveConfigValue(config) {
	if (config.startsWith('!')) return executeCommand(config);
	const envValue = process.env[config];
	return envValue || config;
}

/** Synchronous variant for CLI hot paths (env-name → value, literal fallback). */
export function resolveConfigValueSync(config) {
	if (config.startsWith('!')) return undefined; // shell variant is async-only here
	return process.env[config] || config;
}
