var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var tm = require('../lib/tm');
var middleware = require('../lib/middleware');
var style = require('../lib/style');
var tilelive = require('tilelive');
var yaml = require('js-yaml');

describe('middleware', function() {
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

    describe('history', function() {
        var sourceId = 'tmsource://' + path.resolve(path.dirname(__filename), './fixtures-localsource');
        var styleId = 'tmstyle://' + path.resolve(path.dirname(__filename), './fixtures-localsource');

        after(function(done) {
            tm.history('source', sourceId, true);
            tm.history('style', styleId, true);
            done();
        });
        it('loads history', function(done) {
            this.timeout(10000);
            var req = {};
            middleware.history(req, {}, function() {
                assert(req.history, 'has history');
                assert(req.history.source, 'history object includes a source');
                assert(req.history.source['mapbox:///mapbox.mapbox-streets-v4'], 'default source is listed');
                done();
            });
        });
        it('gets style/source info', function(done) {
            var sourceDoc = require('./fixtures-localsource/data.yml');
            var styleDoc = require('./fixtures-localsource/project.yml');
            tm.history('source', sourceId);
            tm.history('style', styleId);

            var req = {};
            middleware.history(req, {}, function() {
                var sourceInfo = req.history.source[sourceId];
                var styleInfo = req.history.style[styleId];
                assert.equal(sourceDoc.attribution, sourceInfo.attribution, 'source info was loaded');
                assert.equal(styleDoc.mtime, styleInfo.mtime, 'style info was loaded');
                done();    
            });
        });
        it('removes dead source/styles', function(done) {
            tm.history('source', 'foo');
            tm.history('style', 'bar');
            var req = {};
            middleware.history(req, {}, function() {
                assert(!req.history.source.foo, 'source `foo` was removed');
                if (req.history.style) assert(!req.history.style.bar, 'style `bar` was removed');
                done();
            });
        });
    });

    describe('writeStyle', function() {
        var tmpId = '/tmp/tm2-perm-' + (+new Date);
        after(function(done) {
            setTimeout(function() {
                ['project.xml','project.yml','a.mss','.thumb.png'].forEach(function(file) {
                    try { fs.unlinkSync(tmpId + '/' + file) } catch(err) {};
                });
                try { fs.rmdirSync(tmpId) } catch(err) {};
                done();
            }, 250);
        });
        it('makes tmp styles', function(done) {
            var req = { body: {} };
            middleware.writeStyle(req, {}, function() {
                assert(req.style, 'appends style to req');
                assert(tm.tmpid('tmstyle:', req.style.data.id), 'creates a valid tmp id');
                var history = tm.history();
                if (history.style) {
                    assert(history.style.indexOf(req.style.data.id) === -1, 'does not write to history');
                }

                style.info('tmstyle://' + path.dirname(require.resolve('tm2-default-style')), function(err, defaultInfo) {
                    delete req.style.data.id;
                    delete req.style.data.mtime;
                    delete req.style.data._tmp;
                    delete req.style.data.background;
                    delete defaultInfo.id;
                    delete defaultInfo.mtime;
                    
                    assert.deepEqual(req.style.data, defaultInfo, 'mimics default style');
                    done(); 
                });
            });
        });
        it('makes persistent styles', function(done) {
            var data = {
                id:'tmstyle://' + tmpId,
                name:'tmp-1234',
                source:'mapbox:///mapbox.mapbox-streets-v2',
                styles:{ 'a.mss': '#water { polygon-fill:#fff }' }
            };
            var req = { body: data };
            middleware.writeStyle(req, {}, function() {
                assert(req.style, 'appends style to req');
                assert(!tm.tmpid('tmstyle:', req.style.data.id), 'does not create a tmp id');
                assert(tm.history().style.indexOf(req.style.data.id) !== -1, 'writes to history');
                assert.equal(req.style.data.name, data.name, 'has correct info');
                assert.ok(/maxzoom: 22/.test(fs.readFileSync(tmpId + '/project.yml', 'utf8')), 'saves project.yml');
                assert.equal(data.styles['a.mss'], fs.readFileSync(tmpId + '/a.mss', 'utf8'), 'saves a.mss');
                done();
            });
        });
        // @TODO: testing this requires some work on source.invalidate
        // it('invalidates source if req._recache', function() {
        //     done();
        // });
    });
    
    describe('loadStyle', function() {
        it('loads a tmp style', function(done) {
            var writeReq = { body: {} };
            middleware.writeStyle(writeReq, {}, function() {
                var req = { query: { id: writeReq.style.data.id } };
                middleware.loadStyle(req, {}, function() {
                    assert(req.style, 'appends style to req');
                    assert.equal(req.style.data.id, writeReq.style.data.id, 'has the correct id');
                    var history = tm.history();
                    if (history.style) {
                        assert(history.style.indexOf(req.style.data.id) === -1, 'does not write to history');
                    }
                    done();
                });
            });
        });
        it('loads a persistent style', function(done) {
            var styleId = 'tmstyle://' + path.resolve(path.dirname(__filename), './fixtures-localsource');
            var styleDoc = require('./fixtures-localsource/project.yml');
            var req = { query: { id: styleId } };
            middleware.loadStyle(req, {}, function() {
                assert(req.style, 'appends style to req');
                assert.equal(req.style.data.id, styleId, 'has the correct id');
                assert(tm.history().style.indexOf(req.style.data.id) !== -1, 'writes to history');
                assert.equal(req.style.data.mtime, styleDoc.mtime, 'style info was loaded');
                done();
            });
        });
    });
});