#! /bin/bash

./build-html.sh default-build
find . -type d -maxdepth 1 -mindepth 1 -name 'plugins-*' -exec ./build-plugin.sh {} \;
