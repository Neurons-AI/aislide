# DeckCraft fork for AI Slide

This fork (`github.com/xnohat/deckcraft`, branch **`ai-slide`**) is the file and render engine
of the **AI Slide** AI App (AICoworker, `skills/ai-slide`). Upstream: `storytold/deckcraft`.

## What the fork adds

| Path | Purpose |
|---|---|
| `crates/wasm-core/` | The engine as a plain C-ABI WebAssembly module (no wasm-bindgen): `dc_import`, `dc_export`, `dc_render_png`, `dc_render_backdrop`, `dc_export_pdf`, `dc_outline`, `dc_to_outline`, `dc_add_font`. JSON in/out; media bytes travel base64 in `mediaData`. |
| `scripts/build-ai-slide-engine.sh` | Builds `wasm32-unknown-unknown` release, installs `deckcraft.wasm` + `ENGINE_VERSION` into the app, runs a Node smoke test. |
| `scripts/sync-upstream.sh` | Checks/merges upstream, tests, rebuilds, pushes. |

Upstream crates are **not modified**. Keep it that way: everything app-specific lives in
`crates/wasm-core`, so upstream merges stay conflict-free.

## How the app uses it

`skills/ai-slide/backend/engine.mjs` loads the wasm in Node. `backend/dcmodel.mjs` converts the
DeckCraft model into the editor's deck and merges edits back. The DeckCraft model of every opened
file is kept as the master copy (`userDataDir/engine/<key>.json`), so masters, themes, SmartArt, effects
and kept XML survive a save untouched. A save with no edits writes identical slide content.
The editor shows an engine-rendered backdrop (`dc_render_backdrop`) under the editable shapes.
Legacy `.ppt/.pps/.pot` and `.odp/.otp` go through LibreOffice (or PowerPoint) to `.pptx` first.

## Routine

- Weekly (cron in AICoworker): `scripts/sync-upstream.sh`. It only checks. If it is behind, run it with `--apply`.
- After any change in `crates/wasm-core`: run `scripts/build-ai-slide-engine.sh`, then
  `node <app-creator>/scripts/validate_app.mjs skills/ai-slide --tier 0 --test`.
- Upstream API drift: `crates/wasm-core/src/lib.rs` is the only file that touches upstream APIs.
  The model JSON shape is what `backend/dcmodel.mjs` reads. Re-run `skills/ai-slide/_d.mjs`.
  It is the round-trip test: a no-op save must be identical, and edits must survive a re-import.


## The app lives here too: `ai-app/ai-slide/`

The whole AI Slide AI App (page, backend, adapter, tests, `ENGINE-REPAIR.md`) is in
`ai-app/ai-slide/`. It does **not** carry its own copy of the Rust: the install script copies the
crates it needs from `crates/` into the installed app's `engine-src/`.

| Task | Command |
|---|---|
| Install / update the app on a machine | `scripts/install-ai-slide.sh [<workspace>/skills/ai-slide]` — copies the app, puts `engine-src/`, builds + stamps `deckcraft.wasm` (needs Rust once, ~2 min cold) |
| Bring fixes made in the installed app back | `scripts/pull-ai-slide.sh [<app dir>] --commit` — app files → `ai-app/ai-slide/`, changed `engine-src/crates/**/*.rs` → `crates/` |
| Rebuild only the engine of an installed app | `node scripts/stamp-ai-slide-engine.mjs <app dir>` |

## Self-healing: a Rust bug fixed by the AICoworker agent

```
Rust panic (e.g. index out of bounds in crates/pptx/src/lib.rs:72)
  → panic hook (crates/wasm-core) records "message @ file:line"
  → backend/engine.mjs turns the trap into code_error whose stack names engine-src/…/lib.rs:72
  → user still gets a result (JS fallback); page calls reportEngineBug → AICoworker bug ledger
  → repair: agent edits engine-src/…/*.rs in .aicw-fix/work (ENGINE-REPAIR.md tells it how)
  → fix check: engine.mjs sees engine-src hash ≠ SOURCE_HASH → cargo builds the COPY → smoke + tier 0
  → fix diff = a few .rs lines (the wasm never enters the diff) → platform judge passes
  → owner applies → app rebuilds from engine-src (cached by hash) → bug gone
  → scripts/pull-ai-slide.sh --commit carries the .rs fix back here (and upstream as a PR)
```

Verified on 2026-11-11 with a planted bug (`p.slides[2]` on a 2-slide deck): reported as
`code_error … at engine-src/crates/pptx/src/lib.rs:72`, repaired by a 2-line diff
(`p.slides.get(2)`), `fix check` VALID, platform judge PASS, `fix apply` → engine rebuilt in 38 s,
the deck opens again through the engine.

Without Rust on a machine the app works normally (shipped wasm); only a Rust repair needs
`cargo` (`requires.runtimes` lists it as optional; the error says `missing_runtime:cargo`).
