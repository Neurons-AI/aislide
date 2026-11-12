# Repairing the AI Slide engine (Rust → WebAssembly)

Read this when a repair request names a file under `engine-src/`, or an error says
"DeckCraft engine (Rust) panicked" / "the engine Rust source does not compile".

The file engine of AI Slide (open/save PPTX, render slides, PDF) is **DeckCraft**, written in Rust
and compiled to `backend/engine/deckcraft.wasm`. Its full source ships inside the app in
`engine-src/` so it can be repaired like any other app code: **you edit Rust, the app rebuilds
the wasm by itself.** You never copy, commit or hand-edit a `.wasm` file.

## How the app picks its engine (backend/engine.mjs)

1. It hashes `engine-src/` (every `*.rs`, `Cargo.toml`, `Cargo.lock`, font fixture).
2. Hash == `backend/engine/SOURCE_HASH` → it runs the shipped `backend/engine/deckcraft.wasm`.
3. Hash differs (= someone repaired the Rust) → it runs `cargo build -p deckcraft-wasm-core
   --release --target wasm32-unknown-unknown` in `engine-src/` and loads the result.
   Builds are cached by hash in `~/.cache/aicw-ai-slide/wasm/`, the cargo target dir is
   `~/.cache/aicw-ai-slide/target/` (warm rebuild ≈ 20 s, cold ≈ 2 min).
4. A compile error is thrown as `code_error` with the compiler's `error[...]` / `-->` lines.

## How a Rust bug reaches you

- A Rust `panic!` (index out of bounds, `unwrap` on `None`, overflow…) aborts the wasm. The panic
  hook in `engine-src/crates/wasm-core/src/lib.rs` records `message @ crates/<crate>/src/<file>.rs:<line>:<col>`;
  `engine.mjs` turns it into a `code_error` whose stack's first frame is that `.rs` file and line.
  The platform's bug ledger therefore points the repair at `engine-src/crates/.../*.rs`.
- The user is not blocked: open/save fall back to the JavaScript reader/writer, and the page calls
  `reportEngineBug`, which re-raises the engine error so it lands in the bug ledger.
- Reproduce without the app: `node -e "import('./backend/engine.mjs').then(async E => { const fs = await import('fs'); await E.importFile(fs.readFileSync('<file>.pptx')) })"`
  (run from the app dir; it rebuilds from `engine-src/` if you changed it).

## Steps (the normal AI App repair, on the COPY)

```bash
node <app-creator>/scripts/dev_app.mjs <app dir> fix start
# edit <app dir>/.aicw-fix/work/engine-src/crates/<crate>/src/<file>.rs  — the smallest change
node <app dir>/.aicw-fix/work/scripts/engine-check.mjs      # builds the COPY's Rust → wasm, runs the engine smoke
node <app-creator>/scripts/dev_app.mjs <app dir> fix check  # tier 0 + smoke; also rebuilds through engine.mjs
node <app-creator>/scripts/dev_app.mjs <app dir> fix diff   # only .rs lines should appear
```

Rules that matter here (on top of R1–R8 in app-creator `repair.md`):

- **Edit `.rs` only.** Never touch `backend/engine/deckcraft.wasm` or `backend/engine/SOURCE_HASH`
  (a binary diff is thousands of "lines" and the fix is refused); the changed source hash is what
  makes the app rebuild. No new crate, no `Cargo.toml` / `Cargo.lock` change (R4).
- Prefer returning an `Err(...)` / skipping the bad element over panicking: the engine is lenient by
  design (unknown parts are skipped, malformed parts logged and ignored). Never `unwrap()`.
- Add a regression test next to the code (`#[cfg(test)]`) when the fix is more than one line;
  `cargo test -p <crate>` in `engine-src/` must pass (`engine-check.mjs --test` runs it).
- If the machine has no Rust (`missing_runtime:cargo`), the fix cannot be built here: say so and
  give up with `confidence: 0` (R8) — the owner installs Rust from https://rustup.rs once.

## Upstream

`engine-src/` is a subset of https://github.com/xnohat/ai-slide (fork of storytold/deckcraft),
path `ai-app/` holds this app. After the owner applies a fix, it is carried back to the fork with
`scripts/pull-ai-slide.sh` there (commits the changed crates + app files) and offered upstream as a
pull request when it is a real DeckCraft bug.
