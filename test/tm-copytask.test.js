var fs = require('fs');
var path = require('path');
var assert = require('assert');
var tm = require('../lib/tm');
var UPDATE = !!process.env.UPDATE;
var tmp = require('os').tmpdir();

describe('copytask', function() {
    this.timeout(20e3);
    var tmppath = path.join(tmp, 'tm2-test-' + +new Date);
    var from = 'tmsource://' + __dirname + '/fixtures-export';
    var to = 'mbtiles://' + tmppath + '/export.mbtiles';

    before(function(done) {
        tm.config({
            db: path.join(tmppath, 'app.db'),
            cache: path.join(tmppath, 'cache')
        }, done);
    });

    before(function(done) {
        tm.copytask(from, to, function(err, job) {
            assert.ifError(err);
            assert.equal(from, job.id);
            assert.equal(null, job.file);
            assert.equal(null, job.stat);
            assert.ok(!!job.task);
            assert.ok(!!job.stats);
            done();
        });
    });

    after(function(done) {
        var MBTiles = require('mbtiles');
        new MBTiles(to, function(err, src) {
            assert.ifError(err);
            function check(queue) {
                if (!queue.length) return src.getInfo(function(err, info) {
                    assert.ifError(err);
                    if (UPDATE) {
                        fs.writeFileSync(__dirname + '/expected/copytask-info.json', JSON.stringify(info, null, 2));
                    }
                    assert.deepEqual(JSON.parse(fs.readFileSync(__dirname + '/expected/copytask-info.json')), info);
                    done();
                });
                var zxy = queue.shift();
                src.getTile(zxy[0],zxy[1],zxy[2], function(err, buffer) {
                    assert.ifError(err);
                    assert.ok(!!buffer);
                    check(queue);
                });
            }
            check([
                [0,0,0],
                [1,0,0],
                [1,1,0],
                [2,0,1],
                [2,2,1]
            ]);
        });
    });

    after(function(done) {
        try { fs.unlinkSync(path.join(tmppath, 'app.db')); } catch(err) {}
        try { fs.unlinkSync(path.join(tmppath, 'export.mbtiles')); } catch(err) {}
        try { fs.rmdirSync(path.join(tmppath, 'cache')); } catch(err) {}
        try { fs.rmdirSync(tmppath); } catch(err) {}
        done();
    });

    it('blocks new jobs', function(done) {
        tm.copytask('tmsource:///somewhere/else.tm2', to, function(err, job) {
            assert.equal('Active task already in progress', err.message);
            done();
        });
    });
    it('retrieves active job', function(done) {
        tm.copytask(null, null, function(err, job) {
            assert.ifError(err);
            assert.equal(from, job.id);
            assert.equal(null, job.file);
            assert.equal(null, job.stat);
            assert.ok(!!job.task);
            assert.ok(!!job.stats);
            done();
        });
    });
    it('retrieves finished state', function(done) {
        tm.copytask(from, to, function(err, job) {
            assert.ifError(err);
            job.task.on('finished', function() {
                assert.ifError(err);
                setTimeout(function() {
                    tm.copytask(from, to, function(err, job) {
                        assert.ifError(err);
                        assert.equal(from, job.id);
                        assert.ok(!!job.file);
                        assert.ok(!!job.stat);
                        assert.equal(null, job.task);
                        assert.equal(null, job.stats);
                        done();
                    });
                }, 2e3);
            });
        });
    });
    it('no active state', function(done) {
        tm.copytask(from, to, function(err, job) {
            assert.ifError(err);
            assert.ok(!!job);
            done();
        });
    });
});

describe('cleartask', function() {
    this.timeout(20e3);
    var tmppath = path.join(tmp, 'tm2-test-' + +new Date);
    var from = 'tmsource://' + __dirname + '/fixtures-export';
    var to = 'mbtiles://' + tmppath + '/cancel.mbtiles';

    before(function(done) {
        tm.config({
            db: path.join(tmppath, 'app.db'),
            cache: path.join(tmppath, 'cache')
        }, done);
    });

    before(function(done) {
        tm.copytask(from, to, function(err, job) {
            assert.ifError(err);
            assert.equal(from, job.id);
            assert.equal(null, job.file);
            assert.equal(null, job.stat);
            assert.ok(!!job.task);
            assert.ok(!!job.stats);
            done();
        });
    });

    after(function(done) {
        try { fs.unlinkSync(path.join(tmppath, 'app.db')); } catch(err) {}
        try { fs.unlinkSync(path.join(tmppath, 'cancel.mbtiles')); } catch(err) {}
        try { fs.rmdirSync(path.join(tmppath, 'cache')); } catch(err) {}
        try { fs.rmdirSync(tmppath); } catch(err) {}
        done();
    });

    it('cancels active job', function(done) {
        tm.copytask(null, null, function(err, job) {
            assert.ifError(err);
            assert.equal(from, job.id);
            assert.equal(null, job.file);
            assert.equal(null, job.stat);
            assert.ok(!!job.task);
            assert.ok(!!job.stats);
            job.task.on('started', function() {
                tm.cleartask(function(err) {
                    assert.ifError(err);
                    assert.ok(!tm._copy);
                    done();
                });
            });
        });
    });

    it('no-op with no active job', function(done) {
        tm.cleartask(function(err) {
            assert.ifError(err);
            assert.ok(!tm._copy);
            done();
        });
    });
});
