mkdir -p "$PWD/../../dist/test"
yarn workspace @tiddlybase/cli run cli -c "$PWD/tiddlybase-config.json" generate:outer.html -o "$PWD/../../dist/test/outer.html"
