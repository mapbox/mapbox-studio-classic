#!/bin/bash
set -e -u

tmpdb=$(mktemp)
styleid="tmstyle://$(pwd)/node_modules/tm2-default-style"

# Kill sub-processes when this script is finished
trap 'kill $(jobs -p)' EXIT

# Make a working copy of the test database that is excluded in .gitignore
cp ./test/fixtures-oauth/test.db $tmpdb

# Run mock oauth server and tm2
node index.js --test --mapboxauth="http://localhost:3001" --port=3001 --db="$tmpdb" &
sleep 2

./node_modules/.bin/mocha-phantomjs "http://localhost:3001/style?id=$styleid&test=true"

# Remove working database
rm $tmpdb

exit 0
