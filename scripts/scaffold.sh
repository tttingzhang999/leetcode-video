#!/usr/bin/env bash
# Usage: scaffold.sh <dest dir> → builds a Remotion project there (shared shell + the lc739 example source to adapt, empty voice manifest)
set -euo pipefail
DEST="${1:?usage: scaffold.sh <dest dir>}"
SKILL_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/.." && pwd)"
[[ -e "$DEST" ]] && { echo "exists: $DEST (reuse it)" >&2; exit 1; }
mkdir -p "$(dirname "$DEST")"
cp -R "$SKILL_DIR/assets/project" "$DEST"
cp -R "$SKILL_DIR/examples/lc739/src" "$DEST/src"
echo '{"scenes": {}}' > "$DEST/src/voice.json"  # make_voice.py fills it
(cd "$DEST" && pnpm install --silent)
echo "created $DEST"
