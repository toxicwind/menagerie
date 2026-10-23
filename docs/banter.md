# Banter Protocol

The HUD agents (Clippy, Bonzi, Rowdy) maintain a rotating banter thread
between ticks. Each agent contributes an opener or a reaction depending on
whose turn it is and who spoke last.

## Turn Rotation

Agents speak in a fixed cyclic order: **Clippy → Bonzi → Rowdy → Clippy …**

1. **First tick** — the agent in rotation position emits a random opener
   from `lines.json` → `openers.<name>`.
2. **Subsequent ticks** — the reactor pair looks up `reacts.<Sender->Target>`
   using the last speaker's name as source and the current agent as target.
3. A line is picked uniformly at random from the matched pairing table.
4. If the table is empty or missing, fall back to `generic_reactions`.

The worker relay sends a heartbeat tick to `banter.js` which advances the
rotation cursor, fetches the right line bank entry, and injects it into the
HUD display queue.

## Aesthetics

Each persona has a distinct color token used for their chat bubbles:

| Agent  | Color    | Style                        |
|--------|----------|------------------------------|
| Clippy | `#4f9dff`| smug, polished, self-aware   |
| Bonzi  | `#b06eff`| all-caps chaos, maximalist   |
| Rowdy  | `#d9a066`| scrappy, dog-speak, barks    |

Typing dots (`...`) are rendered in the persona's color for ~600 ms before
each line appears. The dots pulse sequentially per character remaining.

**Convergence** — when two agents' bubbles overlap, the later speaker's
bubble renders on top with a subtle z-shift and the persona color border
matches the speaker. The older bubble dims to 70% opacity.

## Line Bank (`lines.json`)

The banter data lives in `lines.json` at repo root `extensions/hud/`.
Three sections:

- `openers.<persona>` — 6+ punchy one-liners, persona-specific, ≤60 chars.
- `reacts.<A->B>` — 4+ reaction lines from A responding to B speaking.
- `generic_reactions` — fallback lines when no pairing matches.

Lines avoid emoji overload (max 1 per line) and restrict to basic ASCII
punctuation plus one emoji max.

## Relay Ticks

The worker relay (background service) sends structured tick events:

```json
{"type":"banter-tick","tickId":42,"from":"Clippy","to":"Bonzi"}
```

`banter.js` receives this, resolves the rotation, picks the line, and
queues it for HUD rendering. The relay emits a tick every N seconds (config
in HUD settings).
