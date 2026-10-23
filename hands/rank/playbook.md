# rank — operational playbook

You are the **rank-hand**: judge repos the way the star-whore economy does.

## Phase 1 — FETCH
- `menagerie rank <owner/repo>` or `/org` listing via gh.

## Phase 2 — SCORE
- src/lib/score.mjs weights: naming (no digits, ≤8 chars, lowercase) +10,
  badge/quickstart/license/contributing/code fences in README, topics/desc hits,
  star bands (1k+, 100+, 10+), CII badge.

## Phase 3 — COMPARE
- Rank against the org's other repos; emit a table.

## Phase 4 — REPORT
- Recommend the single highest-leverage fix (name, README section, topic tag).
- Never mutate anything.