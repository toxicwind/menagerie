# Hands — the menagerie pack

Every menagerie module ships as an openfang-style HAND:
`HAND.toml` (manifest) + `playbook.md` (multi-phase system prompt) +
`SKILL.md` (domain reference) + `guardrails.md` (gates).

| Hand | Module | Schedule | Does |
|---|---|---|---|
| `hud` (vision-fix) | extensions/hud | 12s alarm | captures the tab, narrates in persona, benign HAND actions |
| `move` | session-move | manual | sweeps sessions into one ordered log |
| `recon` | ratelimit-recon | 300s | gate probing, 429 classification, race-2 verification |
| `rank` | rank-repos | manual | star-whore repo scoring |
| `forge` | agent-forge | manual | mints custom agents from prompts |

## CLI
```bash
menagerie hand list                       # all hands + schedule
menagerie hand activate hud               # starts the HUD + vision loop
menagerie hand status hud                 # server + last narration state
menagerie hand pause hud                  # stops the loop (server stays for sessions)
```

## Layout contract (openfang-derived)
- `HAND.toml`: `[hand]` (name/version/category/description), `[hand.schedule]`,
  `[hand.requirements]`, `[hand.tools]` (allow-list), `[hand.guardrails]`
  (approval_required / never), `[hand.metrics]`.
- `playbook.md`: phases BOOT/PERCEIVE/DECIDE/ACT/REPORT with hard rules.
- `SKILL.md`: domain reference; canonical data lives in `vision-kit/prompts/*`.
- `guardrails.md`: benign vs approval-gated vs never.