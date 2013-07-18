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

    it('history', function() {
        assert.deepEqual({style:[], source:[
            'mapbox:///mapbox.mapbox-streets-v2',
            'mapbox:///mapbox.mapbox-streets-v3'
        ]}, tm.history(),
            'Inits with defaults');
        assert.deepEqual({style:[], source:[
            'mapbox:///mapbox.mapbox-streets-v2',
            'mapbox:///mapbox.mapbox-streets-v3'
        ]}, tm.history('insufficient args'),
            'Does not attempt set without enough args');
        assert.throws(function() { tm.history('badtype', 'foo') }, /requires valid type/,
            'Throws error on bad type');
        assert.deepEqual({style:['foo'], source:[
            'mapbox:///mapbox.mapbox-streets-v2',
            'mapbox:///mapbox.mapbox-streets-v3'
        ]}, tm.history('style', 'foo'),
            'Sets style');
        assert.deepEqual({style:['foo'], source:[
            'mapbox:///mapbox.mapbox-streets-v2',
            'mapbox:///mapbox.mapbox-streets-v3'
        ]}, tm.history(),
            'Confirm set');
        assert.deepEqual({style:['foo'], source:[
            'bar',
            'mapbox:///mapbox.mapbox-streets-v2',
            'mapbox:///mapbox.mapbox-streets-v3'
        ]}, tm.history('source', 'bar'),
            'Sets source');
        assert.deepEqual({style:['foo'], source:[
            'bar',
            'mapbox:///mapbox.mapbox-streets-v2',
            'mapbox:///mapbox.mapbox-streets-v3'
        ]}, tm.history(),
            'Confirm set');
        assert.deepEqual({style:['foo'], source:[
            'bar',
            'mapbox:///mapbox.mapbox-streets-v2',
            'mapbox:///mapbox.mapbox-streets-v3'
        ]}, tm.history('source', 'bar'),
            'Ignores duplicates');
        assert.deepEqual({style:['foo'], source:[
            'mapbox:///mapbox.mapbox-streets-v2',
            'mapbox:///mapbox.mapbox-streets-v3'
        ]}, tm.history('source', 'bar', true),
            'Invalidates source');
        assert.deepEqual({style:['foo'], source:[
            'mapbox:///mapbox.mapbox-streets-v2',
            'mapbox:///mapbox.mapbox-streets-v3'
        ]}, tm.history(),
            'Confirm invalidation');
        assert.deepEqual({style:['foo'], source:[
            'mapbox:///mapbox.mapbox-streets-v2',
            'mapbox:///mapbox.mapbox-streets-v3'
        ]}, tm.history('source', 'mapbox:///mapbox.mapbox-streets-v2', true),
            'Cannot invalidate default source');
    });
});
