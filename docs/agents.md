# The menagerie cast — personalities, assets, TTS

All agents ship as sprite data + `clippy.js` runtime (vendored at
`third_party/clippy.js`, MIT). Each agent exposes animations (say/listen/think,
wave, dance moves, gestures…) keyed in `animations` maps.

## The ten core agents

| Agent      | Species/vibe       | Default frame | Notes                                                 |
| ---------- | ------------------ | ------------- | ----------------------------------------------------- |
| **Clippy** | Animated paperclip | `Idle`        | The flagship. God-tier self-esteem.                   |
| **Bonzi**  | Purple monkey      | `Idle`        | Chaos maximizer; buddy-mode default pair with Clippy. |
| **Links**  | Cat                | `Idle`        | Quiet supremacy; runs pipelines silently.             |
| **Rover**  | Dog                | `Idle`        | Good-boy energy for repo hygiene.                     |
| **Rocky**  | Dog (gray)         | `Idle`        | The heavier dog.                                      |
| **Peedy**  | Parrot             | `Idle`        | Repeats your commits back to you.                     |
| **Merlin** | Wizard             | `Idle`        | Casts spells on error paths.                          |
| **Genie**  | Genie              | `Idle`        | Three wishes per session, strictly enforced.          |
| **F1**     | Robot              | `Idle`        | The deadpan one.                                      |
| **Genius** | Lightbulb          | `Idle`        | Ideas. So many ideas.                                 |

## Buddy mode

`--agents clippy,bonzi` renders two agents side by side in the HUD with offset
speech balloons. The narrative engine alternates speakers:
`{"speaker":"clippy","say":"..."}` → Clippy talks, Bonzi reacts. Buddy
banter engine is on the roadmap (agent-to-agent dialogue).

## Speech & audio

Native clippy.js has **no audio** — menagerie wires the **Web Speech API**
(`speechSynthesis`) with per-agent voice preferences:

| Agent  | Preferred voice hint        |
| ------ | --------------------------- |
| Clippy | en-US, pitch 0.8            |
| Bonzi  | en-US, pitch 1.4, rate 1.15 |
| Links  | en-US, pitch 0.6            |
| Rover  | en-US, pitch 0.9, rate 0.9  |
| Peedy  | en-US, pitch 1.6            |

Fallback: any available `en-US` voice. TTS disabled with `--mute`.
If `speechSynthesis` is missing (headless), the HUD falls back to visual
balloons only.

## Animation maps

Each agent dir contains:
- `agent.json` — metadata: name, frames per animation, `animations` map
  (e.g. `{"say":[[0,8],[1,8],...], "wave":[[7,12],...]}`),
- `map.png` — sprite sheet (grid columns = frames, rows = animations),
- `sounds/` — optional per-frame audio (rarely used upstream).

`menagerie forge` regenerates all three from a raw grid + `manifest.json` to keep
custom agents byte-compatible with the runtime.
