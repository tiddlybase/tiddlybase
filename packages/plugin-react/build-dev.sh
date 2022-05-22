#!/usr/bin/env bash

pluginDir="../../dist/plugins/tiddlybase/react"
filesDir="$pluginDir/files"
mkdir -p "$filesDir"
destination="$filesDir/react.js"
if [ ! -f "$destination" ]; then
  curl -o "$destination" 'https://unpkg.com/react@18.0.0/umd/react.development.js'
fi
destination="$filesDir/react-dom.js"
if [ ! -f "$destination" ]; then
  curl -o "$destination" 'https://unpkg.com/react-dom@18.0.0/umd/react-dom.development.js'
fi
cp "../../node_modules/react/cjs/react-jsx-runtime.production.min.js" "$filesDir/react-jsx-runtime.js"
MODE=development yarn webpack
