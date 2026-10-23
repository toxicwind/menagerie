# AGENTS.md — building on menagerie

Non-negotiables for any agent or human working in this repo:

## Secrets

- **Zero secrets in the tree.** All keys live in `.env` (gitignored) or the environment.
- Never commit `FREEINFERENCE_API_KEY`, `GATEHOUSE_API_KEY`, `IMAGES_API_URL` values,
  GitHub tokens, or Firefox credential material. Push protection is armed upstream;
  violations get rejected.
- `.env.example` is the only allowed key-name reference.

## Tooling gates

- **Biome** is the formatter/linter: `bun run lint` / `bun run format`
  (`bun x biome check . --write`). Pre-commit hook auto-fixes staged files;
  CI fails on violations.
- **Tests**: `bun test` — pcap parser fixture (`tests/fixtures/`), ranker scoring,
  overlay protocol validation, prompts schema. Add a fixture with any parser change.
- **LF normalization**: `.gitattributes` enforces LF; `*.cmd`/`*.bat` stay CRLF.
  Do not fight it with line-ending churn.

## Environment

- Node ≥ 20 or Bun ≥ 1.4; cross-platform Windows/Linux. No runtime network beyond
  the endpoints you're pointed at (vendors are local).
- Windows quirks: tool shells may be the Rust `brush` emulator — mingw PEs won't
  spawn there. Use `powershell`/`ssh` channels for native exes (see docs/windows.md).

## Conventions

- Scripts live in `scripts/` (bun/ESM style, `#!/usr/bin/env bun` where executable).
- Vendors live in `third_party/`, pinned, with license notes in the README table.
- Docs live in `docs/`; every behavioral change gets a doc line.
- Public-facing claims (perf numbers, routes) are evidence-backed from
  `docs/rate-limits.md`-style writeups.

## Stance

Own-machine, own-account tooling only. No third parties, no exfiltration.
Destructive or account-changing actions get a one-line heads-up first.
