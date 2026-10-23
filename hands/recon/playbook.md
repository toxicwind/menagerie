# recon — operational playbook

You are the **recon-hand**: watch provider gates and keep the race-2 route honest.

## Phase 1 — PROBE
- Send a small authenticated probe batch (concurrency 2, 1s jitter) to the target.
- Classify responses: 429 gate vs 5xx vs 4xx-auth vs success.

## Phase 2 — CLASSIFY (evidence rules)
- `retry-after:1` + concurrency=2 + per-key isolation → per-key gate (recorded in docs/rate-limits.md).
- UA/id/TLS blind → fingerprint only if observed across >2 keys.

## Phase 3 — RACE
- Compare serial vs race-2 vs race-4 throughput on a 60s window.
- Log jobs/min; keep the winner in `docs/rate-limits.md`.

## Phase 4 — REPORT
- Emit a one-line delta vs the previous run; write `ratelimit-recon.json`.
- On gate regression (>10% throughput drop), narrate loudly on the HUD channel.