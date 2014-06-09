#!/bin/bash
set -e -u
set -o pipefail

testPath=$(dirname $0)/..
tmpdb=$(mktemp -d -t XXXXXXXXXXX)/tm2-test.db
styleid="tmstyle://$(pwd)/node_modules/tm2-default-style"
sourceid="tmsource://$(pwd)/test/fixtures-localsource"

# Kill sub-processes when this script is finished
trap 'kill $(jobs -p)' EXIT

# Make a working copy of the test database that is excluded in .gitignore
cp ./test/fixtures-oauth/test.db $tmpdb

# Run mock oauth server and tm2
node index.js --test --cwd=$testPath --mapboxauth="http://localhost:3001" --mapboxtile="http://localhost:3001/v4" --port=3001 --db="$tmpdb" &
sleep 2

./node_modules/.bin/mocha-phantomjs "http://localhost:3001/style?id=$styleid&test=true"
./node_modules/.bin/mocha-phantomjs "http://localhost:3001/source?id=$sourceid&test=true"

# Remove working database
rm $tmpdb

exit 0
