#!/usr/bin/env bash
set -x
set -e

TWDIR="${1:-.}"
OUT="${2:-./test.html}"

mkdir -p "$(dirname "$OUT")"

yarn workspace @tiddlybase/root run move_sourcemaps
TIDDLYWIKI_PLUGIN_PATH="../../dist/plugins" yarn run tiddlywiki "$TWDIR" --verbose --output "$(dirname "$OUT")" --rendertiddler $:/core/save/all "$(basename "$OUT")" text/plain
