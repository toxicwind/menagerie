#!/usr/bin/env bun
// ratelimit-recon — freeinference-SPECIFIC concurrency-gate recon.
// Charted: what the 429 gate is, when slots free, what identifiers matter.
//   gate A: concurrency_limit_exceeded "limit: 2"
//   gate B: rate_limit_exceeded (burn/window quota — appears burstily)
// Phases:
//   1 BURST   12 concurrent, max_tokens 2            → 200/429 split, latencies, headers, error codes
//   2 CADENCE serial 25 with 900ms gaps               → does a lone stream ever 429? (slot hold vs burn)
//   3 LOCKSTEP bursts of 3 every 3s (x6)              → release cadence / idle-window drops
//   4 IDENTITY rotate X-Request-ID + X-Session-ID     → gate keyed on client IP/key, not request id
//   5 UA-PROBE concurrent × {chrome, node-undici, anthropic-claude} → is the gate UA-sensitive?
const REAL_UA = "opencode-kilo-provider/1.0 (ratelimit-recon)";
const CLAUDE_UA = "code-cli/2.0.0 (claude-code)";
const KEY = process.env.FREEINFERENCE_API_KEY;
if (!KEY) { console.error("FREEINFERENCE_API_KEY not set (see ~/.omp/agent/models.yml apiKey)"); process.exit(1); }
const URL = "https://freeinference.org/v1/chat/completions";
const model = "deepseek-v4-flash";

async function hit(extraHeaders = {}) {
  const t0 = Date.now();
  const res = await fetch(URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json", "User-Agent": REAL_UA, ...extraHeaders },
    body: JSON.stringify({ model, max_tokens: 2, messages: [{ role: "user", content: "hi" }] }),
  });
  const body = await res.text();
  let code = null, retryAfterMs = null;
  try { const j = JSON.parse(body); code = j.error?.code || null; retryAfterMs = j.error?.retry_after_ms ?? null; } catch {}
  return {
    status: res.status, ms: Date.now() - t0,
    retryAfter: res.headers.get("retry-after"), xrlLimit: res.headers.get("x-ratelimit-limit"),
    xrlRemaining: res.headers.get("x-ratelimit-remaining"), xrlReset: res.headers.get("x-ratelimit-reset"),
    cfRay: res.headers.get("cf-ray"), code, retryAfterMs,
  };
}

const rows = [];
console.log("PHASE 1 — BURST 12 concurrent (same key, same model):");
const burst = await Promise.all(Array.from({ length: 12 }, () => hit()));
for (const r of burst) { rows.push({ phase: "burst", ...r }); console.log(`  ${r.status} ${r.ms}ms code=${r.code || "-"} retryAfter=${r.retryAfterMs ?? r.retryAfter ?? "-"} xrl=${r.xrlLimit ?? "-"}/${r.xrlRemaining ?? "-"}`); }
const b200 = burst.filter(r => r.status === 200).length;
console.log(`  => ${b200}×200 ${burst.length - b200}×429 (gate: ${burst[0]?.code || burst.find(r => r.code)?.code || "?"})`);

console.log("\nPHASE 2 — SERIAL 25, 900ms apart (does a lone stream ever 429?):");
let serial429 = 0;
for (let i = 0; i < 25; i++) {
  const r = await hit();
  rows.push({ phase: "serial", ...r });
  if (r.status === 429) serial429++;
  if (i < 6 || r.status === 429) console.log(`  #${i} ${r.status} ${r.ms}ms code=${r.code || "-"}`);
  await Bun.sleep(900);
}
console.log(`  => serial 429s: ${serial429}/25 (0 ⇒ concurrency-gate only; >0 ⇒ burn window too)`);

console.log("\nPHASE 3 — LOCKSTEP: bursts of 3 every 3s x6 (release cadence):");
for (let round = 0; round < 6; round++) {
  const t = await Promise.all(Array.from({ length: 3 }, () => hit()));
  rows.push({ phase: `lockstep-${round}`, burst: t });
  const ok = t.filter(r => r.status === 200).length;
  console.log(`  round ${round}: ${ok}/3 ok — ${t.map(r => r.status).join(",")} (ms ${t.map(r => r.ms).join("/")})`);
  await Bun.sleep(2900);
}

console.log("\nPHASE 4 — IDENTITY: 6 concurrent with rotated X-Request-ID/X-Session-ID:");
const ids = Array.from({ length: 6 }, (_, i) => hit({ "X-Request-ID": `recon-${i}`, "X-Session-ID": `sess-${i % 3}` }));
const idr = await Promise.all(ids);
for (const r of idr) rows.push({ phase: "identity", ...r });
console.log(`  => ${idr.filter(r => r.status === 200).length}/6 ok — rotated ids don't change the count if the gate is key/IP-based`);

console.log("\nPHASE 5 — UA-PROBE: 6 concurrent, 2× per UA (chrome / undici-node / claude-code):");
const uas = [
  ["chrome", REAL_UA],
  ["undici-node", ""],
  ["claude-code", CLAUDE_UA],
];
const uaRuns = await Promise.all(uas.flatMap(([label, ua]) => {
  const h = ua ? { "User-Agent": ua } : { "User-Agent": "node" };
  return [{ label, ...h }, { label, ...h }].map(headers => hit(headers).then(r => ({ label, ...r })));
}));
for (const r of uaRuns) rows.push({ phase: "ua-probe", ...r });
for (const [label] of uas) {
  const g = uaRuns.filter(r => r.label === label);
  console.log(`  ${label.padEnd(12)} ${g.filter(r => r.status === 200).length}/${g.length} ok (ms ${g.map(r => r.ms).join("/")})`);
}

await Bun.write("ratelimit-recon.json", JSON.stringify(rows, null, 1));

const summary = {
  burst: { ok: b200, blocked: burst.length - b200, gate: burst[0]?.code || "unknown" },
  serial429,
  lockstep: rows.filter(r => r.phase?.startsWith("lockstep")).map(r => ({ round: r.phase, ok: r.burst.filter(x => x.status === 200).length })),
  identity: { ok: idr.filter(r => r.status === 200).length, total: idr.length },
};
console.log("\nSUMMARY:", JSON.stringify(summary, null, 1));

if (process.argv.includes("--write-doc")) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync("docs/rate-limits.md", `\n## freeinference recon ${new Date().toISOString().slice(0, 10)}\n\`bun scripts/ratelimit-recon.mjs\` → \`${JSON.stringify(summary)}\`\n`);
  console.error("[write-doc] appended summary to docs/rate-limits.md");
}