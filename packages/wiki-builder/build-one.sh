#! /bin/bash

dirname=$(echo "$1" | cut -d / -f 2-)
yarn workspace @tiddlybase/cli run cli buildwiki -t html -p ./../../dist/plugins -p ./plugins -o ./../../dist/tiddlybase_public/$dirname.html ./$dirname
