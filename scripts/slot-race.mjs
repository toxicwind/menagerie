#!/usr/bin/env bun
// slot-race — the ROUTE through freeinference's concurrency-2 gate.
// Gate: per-client 2 concurrent (`concurrency_limit_exceeded`, retry-after 1s,
// slots release on idle). The omp session holds ~1 slot, leaving ~1 free.
// Strategies compared on completions/minute over the same 30-job workload:
//   serial    1 outstanding — never hits the gate, but never exploits idle drain
//   race-2    2 outstanding — at the published limit, minimal 429 churn
//   race-4    4 outstanding — over-provisioned: floods the gate, catches every
//              release INSTANTLY via 1s retry racing (first-valid-wins)
// Winner = the route. 429s are retried forever (slot-drain wait) with jitter.
// Usage: bun scripts/slot-race.mjs [--jobs 30] [--strategy serial|race-2|race-4]
const KEY = process.env.FREEINFERENCE_API_KEY;
if (!KEY) { console.error("FREEINFERENCE_API_KEY not set"); process.exit(1); }
const arg = (k, d) => Number(process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3)) || d;
const JOBS = arg("jobs", 30);
const STRATEGY = process.argv.find(a => a.startsWith("--strategy="))?.slice(11) || "all";
const MODEL = "deepseek-v4-flash";
const UA = "opencode-kilo-provider/1.0 (slot-race)";

async function attempt() {
  const res = await fetch("https://freeinference.org/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ model: MODEL, max_tokens: 2, messages: [{ role: "user", content: "hi" }] }),
  });
  await res.arrayBuffer();
  return res.status;
}

async function job() {
  const t0 = Date.now();
  let attempts = 0;
  for (;;) {
    attempts++;
    const s = await attempt();
    if (s === 200) return { ms: Date.now() - t0, attempts, ok: true };
    if (s === 429) { await Bun.sleep(1000 + Math.random() * 250); continue; }
    return { ms: Date.now() - t0, attempts, ok: s };
  }
}

async function run(label, width) {
  const t0 = Date.now();
  const done = [];
  let next = 0;
  const workers = Array.from({ length: width }, async () => {
    while (next < JOBS) { const i = next++; done.push(await job()); }
  });
  await Promise.all(workers);
  const wall = (Date.now() - t0) / 1000;
  const ok = done.filter(d => d.ok);
  const ms = ok.map(d => d.ms).sort((a, b) => a - b);
  const p50 = ms[Math.floor(ms.length / 2)] || 0, p95 = ms[Math.floor(ms.length * 0.95)] || ms[ms.length - 1] || 0;
  const attempts = done.reduce((a, d) => a + d.attempts, 0);
  const row = { label, width, jobs: JOBS, ok: ok.length, wall_s: +wall.toFixed(1),
    jobsPerMin: +((ok.length / wall) * 60).toFixed(1), p50_ms: p50, p95_ms: p95,
    totalAttempts: attempts, retriesPerJob: +(attempts / JOBS).toFixed(2) };
  console.log(JSON.stringify(row));
  return row;
}

const out = [];
if (STRATEGY === "all" || STRATEGY === "serial") out.push(await run("serial", 1));
if (STRATEGY === "all" || STRATEGY === "race-2") out.push(await run("race-2", 2));
if (STRATEGY === "all" || STRATEGY === "race-4") out.push(await run("race-4", 4));
const winner = out.sort((a, b) => b.jobsPerMin - a.jobsPerMin)[0];
console.log(`\nROUTE: ${winner.label} — ${winner.jobsPerMin} jobs/min (p95 ${winner.p95_ms}ms, retries/job ${winner.retriesPerJob})`);
await Bun.write("slot-race.json", JSON.stringify(out, null, 1));