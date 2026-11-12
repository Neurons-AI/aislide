#!/usr/bin/env bash
# Keep the fork (Neurons-AI/aislide, branch main) current with storytold/deckcraft.
#   scripts/sync-upstream.sh            # check only: prints how far behind we are
#   scripts/sync-upstream.sh --apply    # merge upstream/main into ai-slide, build, test, push
# Exit 0 = up to date or merged cleanly; 2 = conflicts (left for a human, nothing pushed); 3 = build/test failed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
git remote get-url upstream >/dev/null 2>&1 || git remote add upstream https://github.com/storytold/deckcraft
git fetch -q upstream main
BEHIND=$(git rev-list --count HEAD..upstream/main)
echo "behind upstream/main by $BEHIND commit(s)"
[ "$BEHIND" = 0 ] && exit 0
git log --oneline HEAD..upstream/main | head -20
[ "${1:-}" = "--apply" ] || exit 0
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then echo "working tree not clean - aborting"; exit 2; fi
if ! git merge --no-edit upstream/main; then git merge --abort; echo "CONFLICT - resolve by hand"; exit 2; fi
cargo test -q -p deckcraft-pptx -p deckcraft-format -p deckcraft-wasm-core || { echo "tests failed after merge"; git reset -q --hard ORIG_HEAD; exit 3; }
scripts/build-ai-slide-engine.sh || { echo "engine build failed"; git reset -q --hard ORIG_HEAD; exit 3; }
git push -q origin HEAD
echo "merged + rebuilt + pushed"
