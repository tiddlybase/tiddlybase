#!/usr/bin/env bash
VERSION="$(cat package.json | jq -r '.dependencies["@mui/material"]')"
BUILD="${1:-production.min}"
pluginDir="../../dist/plugins/tiddlybase/mui"
filesDir="$pluginDir/files"
mkdir -p "$filesDir"
destination="$filesDir/material-ui.js"
if [ ! -f "$destination" ]; then
  curl -o "$destination" "https://unpkg.com/@mui/material@$VERSION/umd/material-ui.$BUILD.js"
fi
yarn webpack
