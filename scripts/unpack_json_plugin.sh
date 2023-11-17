#! /usr/bin/env bash
if [[ $# -eq 0 ]] ; then
    echo 'Must pass the path to the JSON plugin as argument'
    exit 0
fi
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PLUGIN_JSON="$1"
OUTPUT=${2:-output}
mkdir -p "$OUTPUT"
TITLE="$(jq -r '.[0].title' < "$PLUGIN_JSON")"
FILTER="[[$(jq -r '.[0].text | fromjson | .tiddlers | keys | map(tostring) | join("]] [[")' < "$PLUGIN_JSON")]]"
node "$DIR/../node_modules/tiddlywiki/tiddlywiki.js"  --load "$PLUGIN_JSON" --output "$OUTPUT" --unpackplugin "$TITLE" --save "$FILTER" "[is[system]removeprefix[$:/]addprefix[_system/]]"

