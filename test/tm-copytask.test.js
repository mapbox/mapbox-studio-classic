var test = require('tape');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var tm = require('../lib/tm');
var UPDATE = !!process.env.UPDATE;
var tmppath = path.join(require('os').tmpdir(), 'tm2-copytask-' + (+new Date));
var from = 'tmsource://' + __dirname + '/fixtures-export';
var copy = 'mbtiles://' + tmppath + '/export.mbtiles';
var clear = 'mbtiles://' + tmppath + '/cancel.mbtiles';

test('setup: config', function(t) {
    tm.config({
        db: path.join(tmppath, 'app.db'),
        tmp: tmppath,
        cache: path.join(tmppath, 'cache')
    }, t.end);
});

test('copytask: start', function(t) {
    tm.copytask(from, copy, function(err, job) {
        t.ifError(err);
        t.equal(from, job.id);
        t.equal(null, job.file);
        t.equal(null, job.stat);
        t.ok(!!job.task);
        t.ok(!!job.stats);
        t.end();
    });
});

test('copytask: blocks new jobs', function(t) {
    tm.copytask('tmsource:///somewhere/else.tm2', copy, function(err, job) {
        t.equal('Active task already in progress', err.message);
        t.end();
    });
});

test('copytask: retrieves active job', function(t) {
    tm.copytask(null, null, function(err, job) {
        t.ifError(err);
        t.equal(from, job.id);
        t.equal(null, job.file);
        t.equal(null, job.stat);
        t.ok(!!job.task);
        t.ok(!!job.stats);
        t.end();
    });
});

test('copytask: retrieves finished state', function(t) {
    tm.copytask(from, copy, function(err, job) {
        t.ifError(err);
        job.task.on('finished', function() {
            t.ifError(err);
            setTimeout(function() {
                tm.copytask(from, copy, function(err, job) {
                    t.ifError(err);
                    t.equal(from, job.id);
                    t.ok(!!job.file);
                    t.ok(!!job.stat);
                    t.equal(null, job.task);
                    t.equal(null, job.stats);
                    t.end();
                });
            }, 2e3);
        });
    });
});

test('copytask: no active state', function(t) {
    tm.copytask(from, copy, function(err, job) {
        t.ifError(err);
        t.ok(!!job);
        t.end();
    });
});

test('copytask: end', function(t) {
    var MBTiles = require('mbtiles');
    new MBTiles(copy, function(err, src) {
        t.ifError(err);
        src._db.get('select count(1) as count, sum(length(tile_data)) as size from tiles;', function(err, row) {
            t.ifError(err);
            t.equal(row.count, 341);
            t.equal(row.size, 22245);
            check([
                [0,0,0],
                [1,0,0],
                [1,1,0],
                [2,0,1],
                [2,2,1]
            ]);
        });
        function check(queue) {
            if (!queue.length) return src.getInfo(function(err, info) {
                t.ifError(err);
                if (UPDATE) {
                    fs.writeFileSync(__dirname + '/expected/copytask-info.json', JSON.stringify(info, null, 2));
                }
                t.deepEqual(JSON.parse(fs.readFileSync(__dirname + '/expected/copytask-info.json')), info);
                t.end();
            });
            var zxy = queue.shift();
            src.getTile(zxy[0],zxy[1],zxy[2], function(err, buffer) {
                t.ifError(err);
                t.ok(!!buffer);
                check(queue);
            });
        }
    });
});

test('cleartask: start', function(t) {
    tm.copytask(from, clear, function(err, job) {
        t.ifError(err);
        t.equal(from, job.id);
        t.equal(null, job.file);
        t.equal(null, job.stat);
        t.ok(!!job.task);
        t.ok(!!job.stats);
        t.end();
    });
});

test('cancels active job', function(t) {
    tm.copytask(null, null, function(err, job) {
        t.ifError(err);
        t.equal(from, job.id);
        t.equal(null, job.file);
        t.equal(null, job.stat);
        t.ok(!!job.task);
        t.ok(!!job.stats);
        job.task.on('started', function() {
            tm.cleartask(function(err) {
                t.ifError(err);
                t.ok(!tm._copy);
                t.end();
            });
        });
    });
});

test('no-op with no active job', function(t) {
    tm.cleartask(function(err) {
        t.ifError(err);
        t.ok(!tm._copy);
        t.end();
    });
});

test('cleanup', function(t) {
    try { fs.unlinkSync(path.join(tmppath, 'app.db')); } catch(err) {}
    try { fs.unlinkSync(path.join(tmppath, 'export.mbtiles')); } catch(err) {}
    try { fs.unlinkSync(path.join(tmppath, 'cancel.mbtiles')); } catch(err) {}
    try { fs.rmdirSync(path.join(tmppath, 'cache')); } catch(err) {}
    try { fs.rmdirSync(tmppath); } catch(err) {}
    t.end();
});

