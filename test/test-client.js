#!/usr/bin/env node

// Usage:
//   node test/test-client.js [test name]
//
// Examples:
//   node test/test-client.js
//   node test/test-client.js style

var fs = require('fs');
var path = require('path');
var testutil = require('./util');

var basePath = path.resolve(path.join(__dirname, '..'));
var styleId = 'tmstyle://'+basePath+'/node_modules/mapbox-studio-default-style';
var sourceId = 'tmsource://'+basePath+'/test/fixtures-localsource';
var exportId = 'tmsource://'+basePath+'/test/fixtures-export';
var testPath = path.resolve(path.join(__dirname, '..'));
var tmp = path.join(require('os').tmpdir(), 'tm2-client-' + (+new Date));
var execFile = require('child_process').execFile;
var phantombin = require('phantomjs').path;
var only = process.argv[2];

// Set up tmp dir.
fs.mkdirSync(tmp);

// Make a working copy of the test database that is excluded in .gitignore
fs.writeFileSync(path.join(tmp, 'app.db'), fs.readFileSync(path.join(__dirname, 'fixtures-oauth', 'test.db')));

var tm = require('../lib/tm');
tm.config({
    test: true,
    db: path.join(tmp, 'app.db'),
    tmp: path.join(tmp, 'tmp'),
    cache: path.join(tmp, 'cache'),
    cwd: testPath,
    port: 3001,
    mapboxauth: 'http://localhost:3001',
    mapboxtile: 'http://localhost:3001/v4'
}, listen);

// Test params
var dataPath = path.join(path.dirname(require.resolve('mapnik-test-data')),'data');

function listen(err) {
    if (err) throw err;
    var server = require('../lib/server');
    server.listen(3001, ready);
}

function ready(err) {
    if (err) throw err;
    var exit = 0;
    var tests = [
        {
            name: 'style',
            url: 'http://localhost:3001/style?id={id}&test=true',
            src: 'tmstyle://'+basePath+'/node_modules/mapbox-studio-default-style'
        },
        {
            name: 'source',
            url: 'http://localhost:3001/source?id={id}&test[dataPath]='+dataPath,
            src: 'tmsource://'+basePath+'/test/fixtures-localsource'
        },
        {
            name: 'source-export',
            url: 'http://localhost:3001/mbtiles?id={id}&test=true',
            src: 'tmsource://'+basePath+'/test/fixtures-localsource'
        },
        {
            name: 'source-upload',
            url: 'http://localhost:3001/upload?id={id}&test=true',
            src: 'tmsource://'+basePath+'/test/fixtures-localsource'
        }
    ].filter(function(t) {
        return !only || t.name === only;
    });
    function runTest() {
        if (!tests.length) process.exit(exit);
        var test = tests.shift();
        testutil.createTmpProject(test.name, test.src, function(err, tmpid) {
            if (err) throw err;
            var testURL = test.url.replace('{id}', tmpid);
            execFile(phantombin, [path.join(__dirname, 'test-phantom.js')], { env: { testURL: testURL } }, function(err, stdout, stderr) {
                if (err && err.code) {
                    exit = err.code;
                    console.log(test.name + ' exit ' + err.code);
                }
                console.log(stdout);
                console.warn(stderr);
                runTest();
            });
        });
    }
    runTest();
}

