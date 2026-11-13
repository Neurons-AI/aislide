#!/usr/bin/env bash
# Install / update the AI Slide AI App from this repo into an AICoworker workspace:
#   scripts/install-ai-slide.sh [<workspace>/skills/ai-slide-dev]
# AICoworker builds an app in a folder named <name>-dev (the copy installed from the AICW Store is
# <name> and is never edited): the default target is ai-slide-dev, and the name inside the copy is
# changed by scripts/aicw-dev-name.mjs. A release is made from that folder by AICoworker
# (`dev_app.mjs <dir> pack`: name without -dev, version minor + 1).
# Copies ai-app/ai-slide, puts the Rust source of the crates the engine uses into engine-src/,
# builds deckcraft.wasm from exactly that source and stamps SOURCE_HASH. The app then runs the
# shipped wasm until somebody repairs the Rust; after that it rebuilds from engine-src by itself
# (see ai-app/ai-slide/ENGINE-REPAIR.md).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-$HOME/aicoworker/openclaw/workspace-main/skills/ai-slide-dev}"
CRATES="anim color fonts format geom metafile model pdf pptx render text wasm-core"
mkdir -p "$DEST"
WAS="$(node -e "try{console.log(JSON.parse(require('fs').readFileSync(process.argv[1]+'/app.json','utf8')).version||'')}catch{}" "$DEST")"
rsync -a --exclude node_modules --exclude .git --exclude .aicw-fix --exclude .aicw-dev "$ROOT/ai-app/ai-slide/" "$DEST/"
# The copy keeps its own version when it is ahead (saved changes raise its patch number).
node -e "
const fs=require('fs');const f=process.argv[1]+'/app.json';const was=process.argv[2];
const j=JSON.parse(fs.readFileSync(f,'utf8'));const n=(v)=>String(v||'0').split('.').map(Number);
const a=n(was),b=n(j.version);let newer=false;for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0)){newer=(a[i]||0)>(b[i]||0);break;}}
if(was&&newer){j.version=was;fs.writeFileSync(f,JSON.stringify(j,null,2)+'\\n');}
" "$DEST" "$WAS"
case "$(basename "$DEST")" in *-dev) node "$ROOT/scripts/aicw-dev-name.mjs" "$DEST" ;; esac
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
