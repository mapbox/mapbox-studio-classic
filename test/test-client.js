#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var basePath = path.resolve(path.join(__dirname, '..'));
var styleId = 'tmstyle://'+basePath+'/node_modules/tm2-default-style';
var sourceId = 'tmsource://'+basePath+'/test/fixtures-localsource';
var testPath = path.resolve(path.join(__dirname, '..'));
var tmpdb = path.join(require('os').tmpdir(), 'tm2-test-' + (+new Date) + '.db');
var fork = require('child_process').fork;
var mochabin = path.resolve(path.join(__dirname, '..', 'node_modules', 'mocha-phantomjs', 'bin', 'mocha-phantomjs'));
var phantombin = require('phantomjs').path;

// Make a working copy of the test database that is excluded in .gitignore
fs.writeFileSync(tmpdb, fs.readFileSync(path.join(__dirname, 'fixtures-oauth', 'test.db')));

process.argv.push('--test');
process.argv.push('--db=' + tmpdb);
process.argv.push('--cwd=' + testPath);
process.argv.push('--port=3001');
process.argv.push('--mapboxauth=http://localhost:3001');
process.argv.push('--mapboxtile=http://localhost:3001/v4');

require('../index.js');

var exit = 0;
var tests = [
    'http://localhost:3001/style?id='+styleId+'&test=true',
    'http://localhost:3001/source?id='+sourceId+'&test=true'
];

function runTest() {
    if (!tests.length) {
        fs.unlinkSync(tmpdb);
        process.exit(exit);
        return;
    }
    var url = tests.shift();
    var child = fork(mochabin, [url, '--path='+phantombin]);
    child.on('exit', function(code) {
        exit = exit || code;
        runTest();
    });
}

setTimeout(runTest, 1000);

