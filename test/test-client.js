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
var styleId = 'tmstyle://'+basePath+'/node_modules/tm2-default-style';
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

process.argv.push('--test');
process.argv.push('--db=' + path.join(tmp, 'app.db'));
process.argv.push('--tmp=' + path.join(tmp, 'tmp'));
process.argv.push('--cache=' + path.join(tmp, 'cache'));
process.argv.push('--cwd=' + testPath);
process.argv.push('--port=3001');
process.argv.push('--mapboxauth=http://localhost:3001');
process.argv.push('--mapboxtile=http://localhost:3001/v4');

// Test params
var dataPath = path.join(path.dirname(require.resolve('mapnik-test-data')),'data');

require('../index.js').on('ready', function() {
    var exit = 0;
    var tests = [
        {
            name: 'style',
            url: 'http://localhost:3001/style?id={id}&test=true',
            src: 'tmstyle://'+basePath+'/node_modules/tm2-default-style'
        },
        {
            name: 'print',
            url: 'http://localhost:3001/print?id={id}&test=true',
            src: 'tmstyle://'+basePath+'/node_modules/tm2-default-style'
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
        if (!tests.length) {
            testutil.cleanup();
            try { fs.unlinkSync(path.join(tmp, 'app.db')); } catch(err) {}
            try { fs.rmdirSync(path.join(tmp, 'tmp')); } catch(err) {}
            try { fs.rmdirSync(path.join(tmp, 'cache')); } catch(err) {}
            try { fs.rmdirSync(tmp); } catch(err) {}
            setTimeout(function() {
                process.exit(exit);
            }, 1000);
            return;
        }
        var test = tests.shift();
        testutil.createTmpProject(test.name, test.src, function(err, tmpid) {
            if (err) throw err;
            var testURL = test.url.replace('{id}', tmpid);
            execFile(phantombin, [path.join(__dirname, 'test-phantom.js')], { env: { testURL: testURL } }, function(err, stdout, stderr) {
                if (err && err.code) exit = err.code;
                console.log(stdout);
                console.warn(stderr);
                runTest();
            });
        });
    }
    runTest();
});

