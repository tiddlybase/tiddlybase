#!/usr/bin/env bash
yarn run webpack
# override devDependencies, which cannot be installed when firebase builds the container
jq -s '.[0] + .[1]' package.json package.json.overrides > ../../dist/functions/package.json
pushd ../../dist/functions
npm install
popd
