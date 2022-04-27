#!/usr/bin/env bash
set -e

./build.sh
yarn node launcher.js
