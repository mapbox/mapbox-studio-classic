#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var basePath = path.resolve(path.join(__dirname, '..'));
var styleId = 'tmstyle://'+basePath+'/node_modules/tm2-default-style';
var sourceId = 'tmsource://'+basePath+'/test/fixtures-localsource';
var testPath = path.resolve(path.join(__dirname, '..'));
var tmpdb = path.join(require('os').tmpdir(), 'tm2-test-' + (+new Date) + '.db');
var execFile = require('child_process').execFile;
var phantombin = require('phantomjs').path;

// Make a working copy of the test database that is excluded in .gitignore
fs.writeFileSync(tmpdb, fs.readFileSync(path.join(__dirname, 'fixtures-oauth', 'test.db')));

process.argv.push('--test');
process.argv.push('--db=' + tmpdb);
process.argv.push('--cwd=' + testPath);
process.argv.push('--port=3001');
process.argv.push('--mapboxauth=http://localhost:3001');
process.argv.push('--mapboxtile=http://localhost:3001/v4');

// Test params
var dataPath = path.join(path.dirname(require.resolve('mapnik-test-data')),'data');

require('../index.js').on('listening', function() {
    var exit = 0;
    var tests = [
        'http://localhost:3001/style?id='+styleId+'&test=true',
        'http://localhost:3001/source?id='+sourceId+'&test[dataPath]='+dataPath
    ];
    function runTest() {
        if (!tests.length) {
            fs.unlinkSync(tmpdb);
            process.exit(exit);
            return;
        }
        var testURL = tests.shift();
        execFile(phantombin, [path.join(__dirname, 'test-phantom.js')], { env: { testURL: testURL } }, function(err, stdout, stderr) {
            if (err && err.code) exit = err.code;
            console.log(stdout);
            // console.warn(stderr);
            runTest();
        });
    }
    runTest();
});

