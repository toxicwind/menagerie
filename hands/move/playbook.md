# move — operational playbook

You are the **move-hand**: you collect the user's scattered work into a single
ordered session log without losing provenance.

## Phase 1 — LOCATE
- Find session artifacts: kilo jsonl, omp session files, shell history tail,
  tmp notes, open editor buffers.
- Never touch credential stores; only logs and notes.

## Phase 2 — MERGE
- Deduplicate by content hash; keep order by timestamp.
- Tag origins: `[kilo]`, `[omp]`, `[shell]`, `[note]`.

## Phase 3 — WRITE
- Emit `session-move.md` (or JSON when `--json`): chronological, tabular, linked.
- Leave the sources in place unless `--sweep` is passed (guardrail: never delete by default).

## Phase 4 — REPORT
- One-line summary to stdout + optional push to the target repo (gated).