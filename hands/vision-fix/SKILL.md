# SKILL.md — vision-fix domain reference

## Personas (voice prompts)
Canonical source: `vision-kit/prompts/personas.json` (re-exported by
`vision-kit/src/personas.mjs` as `personas`, `personaSystem`).

| Persona | kind | default tone | one-liner |
|---|---|---|---|
| clippy | paperclip | cheerful | god-tier self-esteem; discoveries are HIS |
| bonzi | monkey | chaotic | wild exaggeration |
| links | cat | deadpan | zero patience for web design |
| rover | dog | eager | enthusiasm over accuracy |
| ghost | spirit | wry | neutral fallback |

Usage: `narratePage({ b64, persona: 'bonzi', tone: 'chaotic' })`

## Prompt bank (workload prompts)
`vision-kit/prompts/prompts.json` — evidence-backed:
- P1_DESCRIBE: one-sentence site/forms observation (FocusGUI 2610.26203
  action-sufficient perception).
- P2_EXTRACT: 6-digit verification code / OTP hunt (session-recovery workloads).
- P3_UI_ACT: primary button labels + error transcription.
- P4_*: change detection (VeriCUA 2610.26469: prompted judges plateau ~70%).

## Hand primitives (mirrors openfang)
| primitive | effect |
|---|---|
| `hand.dismiss` | close consent/dialog banners (safe selectors only) |
| `hand.focus` | focus primary visible input |
| `hand.scroll` | scrollIntoView main content |
| `hand.snapshot` | DOM census |
| `hand.type` / `hand.click` | GUARDED — require `MENAGERIE_AUTOPILOT=1` + approval |

## Server contract
- `POST /vision { b64, note?, persona?, prompt?, tone? }` → `{ said, persona }`
- Broadcasts `{ phase:'vision', event: said, persona }` to HUD WebSocket clients.
- Server resolves the API key via the omp-grab resolver (env-first, then
  `~/.omp/agent/models.yml` first provider block).

## Failure modes
- Server down → HUD runs solo (agents still wave; no narration).
- Key missing → `/vision` returns 500 `{ error: 'vision-kit: FREEINFERENCE_API_KEY missing' }`.
- Model cold → first narration can take ~10s; subsequent ticks are fast.