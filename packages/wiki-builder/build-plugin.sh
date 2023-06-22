#! /bin/bash

dirname=$(echo "$1" | cut -d / -f 2-)
# yarn workspace run changes the current directory, so $pwd needs to be saved beforehand and all paths must be absolute in command line arguments
pwd="$(pwd)"
yarn workspace @tiddlybase/cli run cli buildwiki -t json -p "$pwd/../../dist/plugins" -o "$pwd/../../dist/tiddlybase_public/plugins/$dirname.json" --wiki-info-filename "$pwd/$dirname/tiddlywiki.info" ExportFilter
