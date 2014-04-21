var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var tm = require('../lib/tm');
var middleware = require('../lib/middleware');
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
            var sourceId = 'tmsource://' + path.resolve(path.dirname(__filename), './fixtures-localsource');
            var sourceDoc = require('./fixtures-localsource/data.yml');
            var styleId = 'tmstyle://' + path.resolve(path.dirname(__filename), './fixtures-localsource');
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
});