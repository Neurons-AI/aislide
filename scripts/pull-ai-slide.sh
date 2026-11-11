#!/usr/bin/env bash
# Bring repairs made in an installed AI Slide back into this repo. AICoworker's self-healing
# applies fixes to the INSTALLED app (owner's click); this carries them home:
#   app files            -> ai-app/ai-slide/
#   engine-src/crates/*.rs -> crates/*            (only Rust sources; the app's Cargo.toml copies
#                                                  have dev-dependencies stripped on purpose)
#   scripts/pull-ai-slide.sh [<workspace>/skills/ai-slide] [--commit]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$HOME/aicoworker/openclaw/workspace-main/skills/ai-slide}"
rsync -a --exclude node_modules --exclude .aicw-fix --exclude .aicw-dev --exclude engine-src \
  --exclude backend/engine/deckcraft.wasm --exclude tests/fixtures/template.pptx "$SRC/" "$ROOT/ai-app/ai-slide/"
(cd "$SRC/engine-src" && find crates -name '*.rs') | while read -r f; do
  if [ ! -f "$ROOT/$f" ]; then
    mkdir -p "$(dirname "$ROOT/$f")"; cp "$SRC/engine-src/$f" "$ROOT/$f"; echo "rust (new): $f"
  elif ! cmp -s "$SRC/engine-src/$f" "$ROOT/$f"; then
    cp "$SRC/engine-src/$f" "$ROOT/$f"; echo "rust: $f"
  fi
done
git -C "$ROOT" status --short ai-app crates
if [ "${2:-}" = "--commit" ]; then
  git -C "$ROOT" add ai-app crates
  git -C "$ROOT" commit -m "ai-slide: pull fixes applied in the installed app (AICoworker self-healing)"
  echo "committed — push with: git -C $ROOT push"
fi
