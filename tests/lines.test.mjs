import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const linesPath = join(__dirname, '..', 'extensions', 'hud', 'lines.json');

describe('lines.json schema', () => {
	const raw = readFileSync(linesPath, 'utf8');
	const data = JSON.parse(raw); // will throw if JSON is invalid

	test('JSON parses successfully', () => {
		expect(data).toBeInstanceOf(Object);
	});

	test('has openers, reacts, and generic_reactions keys', () => {
		expect(data).toHaveProperty('openers');
		expect(data).toHaveProperty('reacts');
		expect(data).toHaveProperty('generic_reactions');
		expect(typeof data.openers).toBe('object');
		expect(typeof data.reacts).toBe('object');
		expect(Array.isArray(data.generic_reactions)).toBe(true);
	});

	test('openers contain all three personas', () => {
		const agents = ['Clippy', 'Bonzi', 'Rowdy'];
		for (const a of agents) {
			expect(data.openers).toHaveProperty(a);
			expect(Array.isArray(data.openers[a])).toBe(true);
			expect(data.openers[a].length).toBeGreaterThanOrEqual(6);
		}
	});

	test('openers per agent >= 6 lines', () => {
		for (const [agent, lines] of Object.entries(data.openers)) {
			expect(lines.length).toBeGreaterThanOrEqual(6);
		}
	});

	test('reacts contain all 6 directed pairings', () => {
		const agents = ['Clippy', 'Bonzi', 'Rowdy'];
		for (const from of agents) {
			for (const to of agents) {
				if (from === to) continue;
				const key = `${from}->${to}`;
				expect(data.reacts).toHaveProperty(key);
				expect(Array.isArray(data.reacts[key])).toBe(true);
				expect(data.reacts[key].length).toBeGreaterThanOrEqual(4);
			}
		}
	});

	test('all lines are <= 60 chars', () => {
		const allLines = [];
		for (const lines of Object.values(data.openers)) {
			allLines.push(...lines);
		}
		allLines.push(...data.generic_reactions);
		for (const pairLines of Object.values(data.reacts)) {
			allLines.push(...pairLines);
		}
		for (const line of allLines) {
			expect(line.length).toBeLessThanOrEqual(60);
		}
	});

	test('generic_reactions has entries', () => {
		expect(data.generic_reactions.length).toBeGreaterThanOrEqual(3);
	});
});
