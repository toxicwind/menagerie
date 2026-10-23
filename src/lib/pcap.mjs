/**
 * menagerie lib — pcap stream helpers (pure; used by analyze-pcap + tests).
 */
/** Parse a tiny Ethernet/IP/TCP frame: returns {src, dst, proto, payload} or null. */
export function parseFrame(hex) {
	try {
		const b = Buffer.from(hex, 'hex');
		if (b.length < 14) return null;
		const proto = b.readUInt16BE(12);
		if (proto !== 0x0800) return { etherType: proto, bytes: b.length, payload: b.subarray(14) };
		if (b.length < 34) return null;
		const ihl = (b[14] & 0x0f) * 4;
		const src = [b[26], b[27], b[28], b[29]].join('.');
		const dst = [b[30], b[31], b[32], b[33]].join('.');
		const tcp = b[23] === 6;
		const udp = b[23] === 17;
		if (!tcp && !udp) return { ip: { src, dst, protocol: b[23] }, bytes: b.length };
		const l4 = 14 + ihl;
		const sp = b.readUInt16BE(l4);
		const dp = b.readUInt16BE(l4 + 2);
		return {
			ip: { src, dst, protocol: b[23] },
			l4: tcp ? 'tcp' : 'udp',
			sport: sp,
			dport: dp,
			payload: b.subarray(l4 + (tcp ? 20 : 8)),
		};
	} catch {
		return null;
	}
}
