#! /bin/bash

find . -type d -maxdepth 1 -mindepth 1 -not -path ./plugins -exec ./build-one.sh {} \;
