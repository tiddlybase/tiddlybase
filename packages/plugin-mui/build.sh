#!/usr/bin/env bash
VERSION="5.14.5"
BUILD="${1:-production.min}"
pluginDir="../../dist/plugins/tiddlybase/mui"
filesDir="$pluginDir/files"
mkdir -p "$filesDir"
destination="$filesDir/material-ui.js"
if [ ! -f "$destination" ]; then
  curl -o "$destination" "https://unpkg.com/@mui/material@$VERSION/umd/material-ui.$BUILD.js"
fi
yarn webpack
