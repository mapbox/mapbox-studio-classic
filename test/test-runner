#!/bin/bash
set -e -x

# Run backend tests
mocha -R spec

# Client side tests
$(dirname $0)/test-client.sh
