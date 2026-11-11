#!/usr/bin/env bash
# Install / update the AI Slide AI App from this repo into an AICoworker workspace:
#   scripts/install-ai-slide.sh [<workspace>/skills/ai-slide]
# Copies ai-app/ai-slide, puts the Rust source of the crates the engine uses into engine-src/,
# builds deckcraft.wasm from exactly that source and stamps SOURCE_HASH. The app then runs the
# shipped wasm until somebody repairs the Rust; after that it rebuilds from engine-src by itself
# (see ai-app/ai-slide/ENGINE-REPAIR.md).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-$HOME/aicoworker/openclaw/workspace-main/skills/ai-slide}"
CRATES="anim color fonts format geom metafile model pdf pptx render text wasm-core"
mkdir -p "$DEST"
rsync -a --exclude node_modules --exclude .aicw-fix --exclude .aicw-dev "$ROOT/ai-app/ai-slide/" "$DEST/"
rm -rf "$DEST/engine-src"
mkdir -p "$DEST/engine-src/crates"
for c in $CRATES; do
  rsync -a --exclude benches --exclude examples --exclude fuzz --exclude 'tests/*.rs' "$ROOT/crates/$c" "$DEST/engine-src/crates/"
  # dev-dependencies pull crates the engine does not ship: the app copy has none
  python3 "$ROOT/scripts/strip-dev-deps.py" "$DEST/engine-src/crates/$c/Cargo.toml"
done
cp "$ROOT/ai-app/engine-src.Cargo.toml.in" "$DEST/engine-src/Cargo.toml"
cp "$ROOT/Cargo.lock" "$DEST/engine-src/Cargo.lock"
if [ ! -d "$DEST/node_modules" ]; then (cd "$DEST" && npm install --silent); fi
node "$ROOT/scripts/stamp-ai-slide-engine.mjs" "$DEST"
(cd "$DEST" && node scripts/engine-check.mjs)
echo "AI Slide installed in $DEST"
