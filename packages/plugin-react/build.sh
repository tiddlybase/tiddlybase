#!/usr/bin/env bash

pluginDir="../../dist/plugins/tiddlybase/react"
filesDir="$pluginDir/files"
mkdir -p "$filesDir"
destination="$filesDir/react.js"
if [ ! -f "$destination" ]; then
  curl -o "$destination" 'https://unpkg.com/react@18.2.0/umd/react.production.min.js'
fi
destination="$filesDir/react-dom.js"
if [ ! -f "$destination" ]; then
  curl -o "$destination" 'https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js'
fi
cp "../../node_modules/react/cjs/react-jsx-runtime.production.min.js" "$filesDir/react-jsx-runtime.js"
yarn webpack
