#!/usr/bin/env bash
set -x
set -e

OUTDIR="$PWD/../../dist/browser-test"
mkdir -p "$OUTDIR"
yarn workspace @tiddlybase/cli run cli -c "$PWD/tiddlybase-config.json" generate:outer.html -o "$OUTDIR/outer.html"
