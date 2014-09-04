var test = require('tape');
var fs = require('fs');
var path = require('path');
var tm = require('../lib/tm');
var mkdirp = require('mkdirp');
var tmppath = tm.join(require('os').tmpdir(), 'mapbox-studio', 'Cache ШЖФ - ' + +new Date);
var badpath = tm.join(require('os').tmpdir(), 'mapbox-studio', 'Bad ШЖФ - ' + +new Date);

mkdirp.sync(tmppath);

var Caching = require('../lib/cache');
var TestSource = function(opts, callback) {
    for (var k in opts) this[k] = opts[k];
    return callback(null, this);
};
TestSource.prototype.getTile = function(z,x,y,callback) {
    if (z === 0) {
        callback(null, new Buffer(10), { 'content-type': 'image/png' });
    } else {
        callback(new Error('Tile does not exist'));
    }
};
var caching = Caching(TestSource, tmppath);

test('cache fails without xml/data', function(t) {
    new caching({}, function(err, source) {
        t.equal(err.toString(), 'Error: No hash data for caching source', 'error');
        t.end();
    });
});

test('cache fails to bogus dir', function(t) {
    var bad = Caching(TestSource, badpath);
    new bad({ _xml:'test string' }, function(err, source) {
        t.equal(/^Error: MBTiles/.test(err.toString()), true, 'error');
        t.equal(/SQLITE_CANTOPEN: unable to open database file$/.test(err.toString()), true, 'error');
        t.end();
    });
});

test('cache with xml', function(t) {
    new caching({ _xml:'test string' }, function(err, source) {
        t.ifError(err, 'no error');
        t.equal(fs.existsSync(tm.join(tmppath, '6f8db599de986fab.mbtiles')), true, 'file exists');
        t.ok(source._mbtiles, true, 'mbtiles ref');
        t.equal(source._mbtiles._cacheStats.miss, 1, '_cacheStats.miss 1');
        t.equal(source._mbtiles._cacheStats.hit, 0, '_cacheStats.hit 0');
        t.end();
    });
});

test('cache with data', function(t) {
    new caching({ data: { id: 'test other' } }, function(err, source) {
        t.ifError(err, 'no error');
        t.equal(fs.existsSync(tm.join(tmppath, '99cfcb1455c4b684.mbtiles')), true, 'file exists');
        t.ok(source._mbtiles, true, 'mbtiles ref');
        t.equal(source._mbtiles._cacheStats.miss, 1, '_cacheStats.miss 1');
        t.equal(source._mbtiles._cacheStats.hit, 0, '_cacheStats.hit 0');
        t.end();
    });
});

test('cache with data (hit)', function(t) {
    new caching({ data: { id: 'test other' } }, function(err, source) {
        t.ifError(err, 'no error');
        t.equal(fs.existsSync(tm.join(tmppath, '99cfcb1455c4b684.mbtiles')), true, 'file exists');
        t.ok(source._mbtiles, true, 'mbtiles ref');
        t.equal(source._mbtiles._cacheStats.miss, 1, '_cacheStats.miss 1');
        t.equal(source._mbtiles._cacheStats.hit, 1, '_cacheStats.hit 1');
        t.end();
    });
});

test('cache getTile 404', function(t) {
    new caching({ data: { id: 'test other' } }, function(err, source) {
        t.ifError(err, 'no error');
        source.getTile(1, 0, 0, function(err, buffer, headers) {
            t.equal(err.toString(), 'Error: Tile does not exist');
            setTimeout(again, 500);
        });
        function again() {
            source.getTile(1, 0, 0, function(err, buffer, headers) {
                t.equal(err.toString(), 'Error: Tile does not exist');
                t.end();
            });
        }
    });
});

test('cache getTile', function(t) {
    new caching({ data: { id: 'test other' } }, function(err, source) {
        t.ifError(err, 'no error');
        source.getTile(0, 0, 0, function(err, buffer, headers) {
            t.ifError(err, 'no error');
            t.equal(buffer.length, 10);
            t.equal(buffer._cache, 'miss');
            setTimeout(again, 500);
        });
        function again() {
            source.getTile(0, 0, 0, function(err, buffer, headers) {
                t.ifError(err, 'no error');
                t.equal(buffer.length, 10);
                t.equal(buffer._cache, 'hit');
                t.end();
            });
        }
    });
});

