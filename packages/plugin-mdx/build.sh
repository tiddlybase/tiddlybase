#!/usr/bin/env bash
set -e

dir="../../dist/plugins/tiddlybase/mdx"
mkdir -p "$dir"
yarn rollup -c
yarn webpack
