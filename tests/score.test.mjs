import { describe, expect, test } from 'bun:test';
import { scoreRepo } from '../src/lib/score.mjs';

describe('ranker scoring (scoreRepo)', () => {
	test('bad name with numbers scores low', () => {
		const s = scoreRepo({ name: 'my-repo-v2', description: '', readme: '', stars: 0 });
		expect(s).toBeLessThan(20);
	});

	test('README-max signals add up', () => {
		const base = scoreRepo({ name: 'hydro', description: 'cli tool', stars: 100 });
		const withReadme = scoreRepo({
			name: 'hydro',
			description: 'cli tool',
			stars: 100,
			readme:
				'# hydro\n![badge](https://img.shields.io/badge/x-y)\n## Quick start\n```sh\nnpm i\n```\n## License\nMIT\n',
		});
		expect(withReadme).toBeGreaterThan(base);
		expect(withReadme).toBeLessThanOrEqual(100);
	});

	test('stars scale', () => {
		expect(scoreRepo({ name: 'a', stars: 1 })).toBeGreaterThan(scoreRepo({ name: 'a', stars: 0 }));
		expect(scoreRepo({ name: 'a', stars: 2000 })).toBeGreaterThan(scoreRepo({ name: 'a', stars: 50 }));
	});
});
