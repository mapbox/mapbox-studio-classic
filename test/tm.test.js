var fs = require('fs');
var path = require('path');
var assert = require('assert');
var tm = require('../lib/tm');

describe('tm', function() {

    var tmppath = '/tmp/tm2-test-' + +new Date;
    before(function(done) {
        tm.config({
            db: path.join(tmppath, 'app.db'),
            cache: path.join(tmppath, 'cache')
        }, done);
    });
    after(function(done) {
        try { fs.unlinkSync(path.join(tmppath, 'app.db')); } catch(err) {}
        try { fs.unlinkSync(path.join(tmppath, 'cache', 'font-dbad83a6.png')); } catch(err) {}
        try { fs.rmdirSync(path.join(tmppath, 'cache')); } catch(err) {}
        try { fs.rmdirSync(tmppath); } catch(err) {}
        done();
    });

    it('sortkeys', function() {
        assert.deepEqual(['id', 'bar', 'foo'], Object.keys(tm.sortkeys({
            foo: 'foo',
            bar: 'bar',
            id: 'id'
        })));
    });

    it('filterkeys', function() {
        assert.deepEqual({apples:true,bananas:true}, tm.filterkeys({
            apples: true,
            bananas: true,
            vegetables: true
        }, {apples:'', bananas:''}));
    });

    it('dirfiles', function(done) {
        tm.dirfiles(__dirname + '/fixtures-localsource', function(err, files) {
            assert.ifError(err);
            assert.deepEqual([
                '10m-900913-bounding-box.dbf',
                '10m-900913-bounding-box.index',
                '10m-900913-bounding-box.prj',
                '10m-900913-bounding-box.shp',
                '10m-900913-bounding-box.shx',
                'data.yml',
                'project.yml'
            ], files.map(function(f) { return f.basename }));
            done();
        });
    });

    // @TODO tm.writefiles

    it('history', function() {
        assert.deepEqual({style:[], source:[
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history(),
            'Inits with defaults');
        assert.deepEqual({style:[], source:[
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history('insufficient args'),
            'Does not attempt set without enough args');
        assert.throws(function() { tm.history('badtype', 'foo') }, /requires valid type/,
            'Throws error on bad type');
        assert.deepEqual({style:['foo'], source:[
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history('style', 'foo'),
            'Sets style');
        assert.deepEqual({style:['foo'], source:[
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history(),
            'Confirm set');
        assert.deepEqual({style:['foo'], source:[
            'bar',
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history('source', 'bar'),
            'Sets source');
        assert.deepEqual({style:['foo'], source:[
            'bar',
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history(),
            'Confirm set');
        assert.deepEqual({style:['foo'], source:[
            'bar',
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history('source', 'bar'),
            'Ignores duplicates');
        assert.deepEqual({style:['foo'], source:[
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history('source', 'bar', true),
            'Invalidates source');
        assert.deepEqual({style:['foo'], source:[
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history(),
            'Confirm invalidation');
        assert.deepEqual({style:['foo'], source:[
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history('source', 'mapbox:///mapbox.mapbox-streets-v4', true),
            'Cannot invalidate default source');
    });

    it('font (invalid)', function(done) {
        tm.font('doesnotexist', function(err) {
            assert.equal('Invalid font doesnotexist', err.message);
            done();
        });
    });

    it('font (valid)', function(done) {
        tm.font('Source Sans Pro Bold', function(err, buffer) {
            assert.ifError(err);
            assert.ok(buffer.length > 600 && buffer.length < 1000);
            setTimeout(function() {
                assert.ok(fs.existsSync(path.join(tm.config().cache, 'font-dbad83a6.png')));
                done();
            }, 1000);
        });
    });

    it('font (cache hit)', function(done) {
        var start = +new Date;
        tm.font('Source Sans Pro Bold', function(err, buffer) {
            assert.ifError(err);
            assert.ok(buffer.length > 600 && buffer.length < 1000);
            assert.ok((+new Date - start) < 10);
            done();
        });
    });

    it('tmpid', function() {
        ['tmsource:', 'tmstyle:'].forEach(function(protocol) {
            assert.ok(tm.tmpid(protocol, tm.tmpid(protocol)));
            assert.ok(tm.tmpid(protocol) !== tm.tmpid(protocol));
            assert.ok(tm.tmpid(protocol, 'hello', true) === tm.tmpid(protocol, 'hello', true));
            assert.ok(tm.tmpid(protocol, tm.tmpid(protocol, 'hello world', true)));
            assert.ok(!tm.tmpid(protocol, protocol + '///real/ish/path'));
            assert.ok(!tm.tmpid(protocol, protocol + '///tmp-1234'));
            assert.ok(!tm.tmpid(protocol, 'mapbox:///tmp-1234'));
            assert.ok(tm.tmpid(protocol, protocol + '///tmp-12345678'));
        });
    });
});
