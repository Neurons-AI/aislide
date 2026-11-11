#!/usr/bin/env bash
# Build the DeckCraft engine as WebAssembly and install it into the AI Slide app.
#   scripts/build-ai-slide-engine.sh [path/to/ai-slide]
# Output: <ai-slide>/backend/engine/deckcraft.wasm + ENGINE_VERSION (git sha, upstream sha, date).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="${1:-$ROOT/../../skills/ai-slide}"
cd "$ROOT"
rustup target add wasm32-unknown-unknown >/dev/null 2>&1 || true
cargo build -p deckcraft-wasm-core --release --target wasm32-unknown-unknown
WASM="$ROOT/target/wasm32-unknown-unknown/release/deckcraft_wasm_core.wasm"
if command -v wasm-opt >/dev/null 2>&1; then wasm-opt -Oz --strip-debug "$WASM" -o "$WASM.opt" && mv "$WASM.opt" "$WASM"; fi
mkdir -p "$APP/backend/engine"
cp "$WASM" "$APP/backend/engine/deckcraft.wasm"
UP="$(git rev-parse --short upstream/main 2>/dev/null || echo unknown)"
printf 'fork=%s\nupstream=%s\nbuilt=%s\nbytes=%s\n' "$(git rev-parse --short HEAD)" "$UP" "$(date -u +%FT%TZ)" "$(wc -c < "$WASM" | tr -d ' ')" > "$APP/backend/engine/ENGINE_VERSION"
echo "installed $(wc -c < "$WASM") bytes -> $APP/backend/engine/deckcraft.wasm"
# smoke test: open a pptx through the engine from Node
if [ -f "$APP/tests/fixtures/chart.pptx" ]; then
  (cd "$APP" && node -e "import('./backend/engine.mjs').then(async E=>{const r=await E.importFile(require('fs').readFileSync('tests/fixtures/chart.pptx'));if(!r.presentation.slides.length)process.exit(1);const o=await E.exportFile(r,'pptx');console.log('engine smoke OK:',r.presentation.slides.length,'slides, re-export',o.length,'bytes')})")
fi
