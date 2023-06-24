#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
pushd "$DIR/.."
jq -s '.[1] + {version: .[0].version}' "package.json" "npm-package-json/tiddlybase-public-package.json" > "dist/package.json"
cd "dist"
npm publish --access public
rm package.json
popd
