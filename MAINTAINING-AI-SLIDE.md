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
