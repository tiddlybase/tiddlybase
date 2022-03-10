#!/usr/bin/env bash
pushd ../../dist/functions
npx firebase functions:config:get > .runtimeconfig.json
npx firebase emulators:start --only functions --inspect-functions
popd
