import { describe, expect, test } from 'bun:test';
import { resolveOpenAICompat } from '../src/vendor-omp/openai-compat.mjs';
import { resolveConfigValueSync } from '../src/vendor-omp/resolve-config-value.mjs';

describe('openai-compat resolution (omp-grab semantics)', () => {
	test('env overrides win', () => {
		process.env.IMAGES_API_URL = 'https://example.test/v1';
		process.env.IMAGES_API_KEY = 'env-key';
		const ep = resolveOpenAICompat();
		expect(ep).toEqual({ baseUrl: 'https://example.test/v1', apiKey: 'env-key' });
		delete process.env.IMAGES_API_URL;
		delete process.env.IMAGES_API_KEY;
	});

	test('OPENAI_* aliases work', () => {
		process.env.OPENAI_BASE_URL = 'https://alias.test/v1';
		process.env.OPENAI_API_KEY = 'alias-key';
		const ep = resolveOpenAICompat();
		expect(ep).toEqual({ baseUrl: 'https://alias.test/v1', apiKey: 'alias-key' });
		delete process.env.OPENAI_BASE_URL;
		delete process.env.OPENAI_API_KEY;
	});

	test('models.yml literals resolve env-first, literal fallback (vendored omp semantics)', () => {
		process.env.MENAGERIE_TEST_SECRET = 'env-resolved';
		expect(resolveConfigValueSync('MENAGERIE_TEST_SECRET')).toBe('env-resolved');
		expect(resolveConfigValueSync('DEFINITELY_NOT_SET_ANYWHERE')).toBe('DEFINITELY_NOT_SET_ANYWHERE');
		delete process.env.MENAGERIE_TEST_SECRET;
	});
});
