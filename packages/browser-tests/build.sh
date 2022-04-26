#!/usr/bin/env bash
set -e

yarn workspace @tiddlybase/root run move_sourcemaps
TIDDLYWIKI_PLUGIN_PATH="../../dist/plugins" yarn run tiddlywiki . --verbose --output . --rendertiddler $:/core/save/all test.html text/plain
