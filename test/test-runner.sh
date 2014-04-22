#!/bin/bash
set -e -x

# Kill sub-processes when this script is finished
trap 'kill $(jobs -p)' EXIT

# Run backend tests
mocha -R spec

# Make a working copy of the test database that is excluded in .gitignore
cp ./test/fixtures-oauth/test.db ./test/fixtures-oauth/test-clone.db

# Run mock oauth server and tm2
node ./test/fixtures-oauth/mapbox.js &
node index.js --mapboxauth="http://localhost:3001" --db="./test/fixtures-oauth/test-clone.db" &
sleep 10

# Make a tmp style
IFS='=' read -ra result <<< "$(curl -s http://localhost:3000/new/style)"
styleId=${result[1]}

# Run front-end tests
./node_modules/.bin/mocha-phantomjs "http://localhost:3000/style?id=$styleId&test=true"
sleep 10

exit 0