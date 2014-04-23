#!/bin/bash
set -x

node_modules/.bin/jscoverage lib
TM_COV=1 mocha -R html-cov > ./test/test-coverage.html
exit 0