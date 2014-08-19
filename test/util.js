var tm = require('../lib/tm');
var fs = require('fs');
var tmp = require('os').tmpdir();
var path = require('path');
var libs = {};
libs.style = require('../lib/style');
libs.source = require('../lib/source');

module.exports = {};
module.exports.createTmpProject = createTmpProject;
module.exports.cleanup = cleanup;

var tests = {};

// Creates a temporary project for a given test + id.
function createTmpProject(testname, id, callback) {
    if (typeof testname !== 'string') throw new Error('testname must be a string');

    testname = 'tm2-' + testname;

    var key = testname + '-' + id;
    var lib = id.indexOf('tmsource') === 0 ? libs.source : libs.style;

    // Return path to tmp project if set in cache.
    if (tests[key]) return callback(null, tests[key].id, tests[key]);

    lib.info(id, function(err, info) {
        if (err) return callback(err);

        // no source applies a local source
        if (!info.source){
            info.source = 'tmsource://' + path.join(__dirname, 'fixtures-localsource');
        }

        // Make relative paths absolute.
        if (info.Layer) info.Layer = info.Layer.map(function(l) {
            if (!l.Datasource) return l;
            if (!l.Datasource.file) return l;
            if (tm.absolute(l.Datasource.file)) return l;
            l.Datasource.file = tm.join(tm.parse(id).dirname, l.Datasource.file);
            return l;
        });

        var tmpdir = path.join(tmp, testname + '-' + Math.random().toString(36).split('.').pop());
        tests[key] = info;
        info.id = tm.parse(id).protocol + '//' + tmpdir;
        lib.save(info, function(err) {
            if (err) return callback(err);
            fs.stat(tmpdir, function(err, stat) {
                if (err) return callback(err);
                return callback(null, info.id, info);
            });
        });
    });
}

function cleanup() {
    for (var key in tests) {
        var tmpdir = tm.parse(tests[key].id).dirname;
        ['data.xml','data.yml','project.xml','project.yml','style.mss','.thumb.png'].forEach(function(f) {
            try { fs.unlinkSync(path.join(tmpdir, f)); } catch(err) {}
        });
        try { fs.rmdirSync(tmpdir); } catch(err) {}
    }
}

