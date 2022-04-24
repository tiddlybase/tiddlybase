#!/usr/bin/env bash

dir="../../dist/plugins/tiddlybase/react"
mkdir -p "$dir"
destination="$dir/react.js"
if [ ! -f "$destination" ]; then
  curl -o "$destination" 'https://unpkg.com/react@18.0.0/umd/react.production.min.js'
fi
destination="$dir/react-dom.js"
if [ ! -f "$destination" ]; then
  curl -o "$destination" 'https://unpkg.com/react-dom@18.0.0/umd/react-dom.production.min.js'
fi
toCopy=("plugin.info" "tiddlywiki.files")
for f in ${toCopy[@]}; do
  cp $f "$dir/$f"
done
