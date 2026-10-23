# vision-fix — the eyes + the factory (ARCHITECTURE)

What was "find vision-fix" became two loops that feed each other.

## Loop 1 — ASSET FACTORY (image generation, the "library" lane)
- **llm4free** (PyPI, `OEvortex/LLM4Free`) installed on Python 3.13 + its
  OpenAI-compatible server on **:8010** (managed service `llm4free-api`).
- 9 TTI providers / 87 image models behind one `/v1/images/generations`.
- **Working route (keyless): `NoLoginTool/flux`** → `files.catbox.moe/<id>.png`
  (~75s first attempt, then fast). Pollinations/qwen-image lanes exist but rate
  limit; Perchance needs a key.
- Forge target: `IMAGES_API_URL=http://127.0.0.1:8010` (no key → forge now
  sends requests WITHOUT the Authorization header).
- Start command (if the service dies):
  `"C:/Users/beebe/AppData/Local/Programs/Python/Python313/python.exe" -m llm4free.server.server --port 8010`

## Loop 2 — VISION HAND (the eyes)
- Extension background worker captures the active tab every 12s →
  `POST /vision { b64, persona }` on the menagerie server (:8734) →
  vision-kit `narratePage` (qwen3.6-35b, FreeInference key via omp-grab) →
  HUD agents balloon the narration (personas rotate clippy → bonzi → links →
  rover).
- Personas: `agents/<name>/agent.toml` (openfang layout: [identity] + [model] +
  system_prompt with `{tone}`); canonical JSON mirror in
  `vision-kit/prompts/personas.json`.
- HAND contract: `hands/vision-fix/` (HAND.toml + playbook + SKILL + guardrails).

## Verified end-to-end (2026-10-23)
- Generated: `NoLoginTool/flux` → `clippy-nologin.png` (830 KB) + `5r4tzn.png`.
- Seen: Clippy: *"adorable little paperclip with legs…"*; Bonzi:
  *"GLOWING YELLOW LUNCHBOX BEAST…"* — both via /vision with real keys.

## Dead lanes (kept for the record)
NIM flux/sd35/sdxl (pod 504/404), OpenRouter images (402 no credits), HF
Inference (egress-blocked), CF Workers AI (token invalid), pollinations direct
(402), vLLM diffusiongemma (text model, catalog-only), qwen-image via OR (absent).