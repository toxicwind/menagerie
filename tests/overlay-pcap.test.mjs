import { describe, expect, test } from 'bun:test';
import { normalizeOverlayPayload } from '../src/lib/overlay-protocol.mjs';
import { parseFrame } from '../src/lib/pcap.mjs';

describe('overlay protocol', () => {
	test('full payload normalizes', () => {
		const out = normalizeOverlayPayload({ phase: 'x', state: 'y', event: 'z', bars: { a: { pct: 42 } } });
		expect(out).toEqual({ phase: 'x', state: 'y', event: 'z', bars: { a: { pct: 42, err: false } } });
	});

	test('pct clamped and junk dropped', () => {
		const out = normalizeOverlayPayload({ bars: { a: { pct: 9001 }, b: { pct: -4 }, c: 'junk' }, event: 42 });
		expect(out.bars.a.pct).toBe(100);
		expect(out.bars.b.pct).toBe(0);
		expect(out.bars.c).toBeUndefined();
	});

	test('empty payload yields null', () => {
		expect(normalizeOverlayPayload(null)).toBeNull();
		expect(normalizeOverlayPayload({})).toBeNull();
	});
});

describe('pcap frame parse', () => {
	test('ethernet/ipv4/tcp frame', () => {
		// eth(14) + ip hdr (20) + tcp hdr (20) + 'hi'
		const buf = Buffer.alloc(14 + 20 + 20 + 2);
		buf.writeUInt16BE(0x0800, 12); // ethertype ipv4
		buf[14] = 0x45; // v4, ihl 5
		buf[23] = 6; // tcp
		buf[26] = 10;
		buf[27] = 0;
		buf[28] = 0;
		buf[29] = 1;
		buf[30] = 10;
		buf[31] = 0;
		buf[32] = 0;
		buf[33] = 2;
		buf.writeUInt16BE(443, 34); // sport
		buf.writeUInt16BE(12345, 36); // dport
		buf.write('hi', 54);
		const f = parseFrame(buf.toString('hex'));
		expect(f.l4).toBe('tcp');
		expect(f.sport).toBe(443);
		expect(f.ip.src).toBe('10.0.0.1');
		expect(f.payload.toString()).toBe('hi');
	});

	test('short garbage returns null', () => {
		expect(parseFrame('aabb')).toBeNull();
	});
});
