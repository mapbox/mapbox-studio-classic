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

    it('history', function() {
        assert.deepEqual({style:[], source:[]}, tm.history(),
            'Inits with defaults');
        assert.deepEqual({style:[], source:[]}, tm.history('insufficient args'),
            'Does not attempt set without enough args');
        assert.throws(function() { tm.history('badtype', 'foo') }, /requires valid type/,
            'Throws error on bad type');
        assert.deepEqual({style:['foo'], source:[]}, tm.history('style', 'foo'),
            'Sets style');
        assert.deepEqual({style:['foo'], source:[]}, tm.history(),
            'Confirm set');
        assert.deepEqual({style:['foo'], source:['bar']}, tm.history('source', 'bar'),
            'Sets source');
        assert.deepEqual({style:['foo'], source:['bar']}, tm.history(),
            'Confirm set');
        assert.deepEqual({style:['foo'], source:['bar']}, tm.history('source', 'bar'),
            'Ignores duplicates');
        assert.deepEqual({style:['foo'], source:[]}, tm.history('source', 'bar', true),
            'Invalidates source');
        assert.deepEqual({style:['foo'], source:[]}, tm.history(),
            'Confirm invalidation');
    });
});
