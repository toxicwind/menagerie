# 🖇️ menagerie

### An automation age spirit-haunted by Clippy.

**The menagerie is a cast of resurrected desktop assistants that run your session
ops, haunt your browser, and narrate your pipelines — on Windows and Linux.**

A furry-friendly, multi-agent automation suite: Clippy, Bonzi, Links, Rover, Rocky,
Peedy, Merlin, Genie, F1 and Genius — each with full personality, speech balloons,
dances, and TTS — wired into a **live in-page HUD** that reads the page, speaks about
it, and (optionally) clicks and types for you. Plus the serious plumbing that makes
it useful: session movement, gate recon, repo ranking, and vision-loop agents.

> ⚠️ **Content warning: this project contains a paperclip with god-tier self-esteem.**
> Do not taunt your build agents.

---

## ✨ What's inside

| Module                | What it does                                                                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`menagerie hud`**   | In-page glass HUD + agent cast over any browser page (CDP userscript-style injection, rides navigation). Buddy mode: `--agents clippy,bonzi` pair them up. |
| **`menagerie move`**  | Push your day's scattered work into one ordered session log (kilo/omp-flavored, remote-safe).                                                              |
| **`menagerie recon`** | Rate-limit / gate recon for LLM providers (429 classification, slot racing). Ships the _race-2_ route.                                                     |
| **`menagerie rank`**  | Star-whore repo ranker — scores GitHub repos for naming, README-max, skill coverage.                                                                       |
| **`menagerie forge`** | Custom-agent generator: sprite grid → clippy.js agent dir; grabs omp's OpenAI-compatible provider by default                                               |
| **vision-kit**        | Vision agent-loop + benches — private fork at `toxicwind/vision-kit`; waitlisted for public sync                                                           |

## 🧑‍🤝‍🧑 The cast (all 10, zero compromise)

Clippy · Bonzi · Links · Rover · Rocky · Peedy · Merlin · Genie · F1 · Genius

```bash
menagerie hud --agents clippy,bonzi   # buddy mode: paperclip + monkey, best friends forever
menagerie hud --agent links           # the cat runs your pipelines, quietly
menagerie hud --agent rover           # good boy energy for repo hygiene
menagerie hud --shuffle               # menagerie chaos mode
```

## 🚀 Quick start (3 commands)

```bash
bun install
cp .env.example .env               # drop your FREEINFERENCE_API_KEY in
bun run cli -- hud https://example.com
```

Requires: [Bun ≥ 1.4](https://bun.sh) (Node ≥ 20 works too). Works on **Windows 10/11**
and **Linux** (macOS untested, PRs welcome). Headed HUD needs a Chromium-based browser;
everything else is headless.

## 🧪 Platform support matrix

| Feature                                  | Windows             | Linux               |
| ---------------------------------------- | ------------------- | ------------------- |
| `hud` (in-page overlay via CDP)          | ✅                  | ✅                  |
| `move` (session log)                     | ✅                  | ✅                  |
| `recon` (rate-limit route)               | ✅                  | ✅                  |
| `rank` (repo score)                      | ✅                  | ✅                  |
| `forge` (agent build)                    | ✅ (needs provider) | ✅ (needs provider) |
| Defender decommission (⚠️ experimental)  | ✅                  | n/a                 |
| Firefox credential recovery (local-only) | ✅                  | ✅                  |

> **Windows war stories:** the tool shells here run a Rust bash-emulator (`brush`);
> mingw-built PEs refuse to spawn there while MSVC/Go/Python binaries don't. Use
> `powershell`/`ssh` channels or `C:/`-style paths for native exec. See
> [docs/windows.md](docs/windows.md) for the full autopsy, including the winget
> "0-byte alias" trap and its `cmd //c winget` shim.

## 🔌 Vendors

Everything is vendored and pinned, no network at runtime:

| Vendor                                                   | Purpose                                                                   | License        |
| -------------------------------------------------------- | ------------------------------------------------------------------------- | -------------- |
| [clippy.js](https://github.com/pi0/clippyjs)             | Agent runtime + sprite data (our fork: `third_party/clippy.js`)           | MIT            |
| [oh-my-pi/pi-ai](https://github.com/oh-my-pi) (omp)      | Vendored provider-value resolver (`src/vendor-omp/`, env-first semantics) | MIT            |
| [blazehttp](https://github.com/nicholasgasior/blazehttp) | HTTP/request fuzzing corpus (submodule)                                   | MIT            |
| [listr2](https://github.com/listr2/listr2)               | Task list rendering for CLI flows                                         | MIT            |
| [citty](https://github.com/unjs/citty)                   | CLI framework (subcommands, cross-platform)                               | MIT            |
| [vision-kit](https://github.com/toxicwind/vision-kit)    | Vision agent loop + benches (submodule)                                   | MIT            |
| DefenderControl                                          | Guarded Defender state inspection (MIT)                                   | MIT            |
| AlteredSecurity/Disable-TamperProtection                 | Tamper-protection research POC (vendored, build w/ mingw)                 | n/a (research) |

## 🔑 Environment

All secrets are **env-only** — zero keys in the repo, by policy:

| Variable                            | Used by                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FREEINFERENCE_API_KEY`             | `recon`, vision benches                                                                                                                                       |
| `IMAGES_API_URL` / `IMAGES_API_KEY` | `forge` custom-agent image gen; **optional** — falls back to omp's own OpenAI-compatible provider (`~/.omp/agent/models.yml` first block, vendored semantics) |
| `GATEHOUSE_API_KEY`                 | (private setups only)                                                                                                                                         |

### Forge & image generation

`forge` ships the full **agent-dir generator** (sprite grid → `agent.json`,
`map.png`, frame metadata). Endpoint resolution: `IMAGES_API_URL`/`IMAGES_API_KEY`
env first, then **omp's own OpenAI-compatible provider** (first block of
`~/.omp/agent/models.yml`, resolved with omp's vendored value semantics:
env-name-first, literal fallback — see `src/vendor-omp/`). No bundled model:
point the endpoint at any `/v1/images/generations`-compatible provider
(FreeInference's images route currently 404s; estate NIM proxy parked; omp
`generate_image` is session-only):
`menagerie forge --prompt "a chibi steelwing raven mascot" --grid 4x4`.

## 📚 Docs

- [docs/rate-limits.md](docs/rate-limits.md) — FreeInference 429 gate: per-key concurrency=2, `retry-after:1`, race-2 route (320 jobs/min vs serial 175).
- [docs/vision-papers.md](docs/vision-papers.md) — vision-model paper hits from the estate bench.
- [docs/windows.md](docs/windows.md) — brush-shell autopsy, winget alias trap, machine-PATH surgery, Defender tamper chronology.
- [docs/agents.md](docs/agents.md) — agent personalities, animation maps, TTS wiring.
- [AGENTS.md](AGENTS.md) — how to build on this repo (env-only, biome-gated).

## 🧰 Development

```bash
bun test            # pcap fixture, ranker scoring, overlay protocol, prompts schema
bun run lint        # biome check (also runs in CI and pre-commit)
bun run format      # biome autofix
```

CI (`.github/workflows/ci.yml`) runs Biome + tests on every push/PR.
Pre-commit hook auto-formats staged code via Biome. LF-normalized via `.gitattributes`.

## 🧭 Roadmap

- [ ] `forge` bundled image-gen provider (first working OpenRouter/estate route)
- [ ] Buddy-mode banter engine (agent-to-agent dialogue in the HUD)
- [ ] `menagerie hunt` — furry asset pack finder (ships extra MS-Agent-era characters: Earl, Max, Robby, WWF Panda…)
- [ ] Native msagent-era sprite packs (not just clippy.js's 10)

## ⚖️ Who is this for?

Super power users with custom workflows and personas. The tech is adversarial-grade
but the stance is _your own machine, your own accounts_: no third parties, no
exfiltration. Firefox credential recovery exists for **local, same-user** recovery
drills — the key material is already on your box.

## 📜 License

MIT — go haunt your own automation age.

---

_"It looks like you're trying to build a sovereign workflow. Would you like help?"_
