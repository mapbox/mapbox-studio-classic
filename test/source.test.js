var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var tm = require('../lib/tm');
var source = require('../lib/source');
var tilelive = require('tilelive');

describe('source', function() {

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

describe('source util', function() {
    it('normalize', function() {
        var n = source.normalize({
            id: 'tmsource://' + __dirname + '/fixtures-localsource',
            Layer: [{
                id: 'box',
                fields: {
                    Id: 'Valid helptext for a field',
                    missing: 'Invalid helptext no field named missing'
                },
                Datasource: {
                    type: 'shape',
                    file: __dirname + '/fixtures-localsource/10m-900913-bounding-box.shp',
                    bogus: 'true'
                }
            }]
        });
        assert.deepEqual(n.Layer.length, 1);
        assert.deepEqual(n.vector_layers.length, 1);
        assert.deepEqual(n.vector_layers[0].fields, {'Id':'Valid helptext for a field'},
            'Populates field help');
        assert.deepEqual(Object.keys(tm.sortkeys(n.Layer[0])), ['id','Datasource','description','fields','properties','srs'],
            'Populates deep defaults in Layer objects');
        assert.deepEqual(Object.keys(tm.sortkeys(n.Layer[0].Datasource)), ['file','type'],
            'Strips invalid datasource properties based on type');
        // @TODO check postgis auto srs extent generation ... without postgis.
    });
});

describe('source remote', function() {
    it('loads', function(done) {
        source('mapbox:///mapbox.mapbox-streets-v2', function(err, source) {
            assert.ifError(err);
            assert.equal('Mapbox Streets V2', source.data.name);
            assert.equal(0, source.data.minzoom);
            assert.equal(14, source.data.maxzoom);
            assert.ok(!!source.style);
            done();
        });
    });
    it('loads via tilelive', function(done) {
        tilelive.load('mapbox:///mapbox.mapbox-streets-v2', function(err, source) {
            assert.ifError(err);
            assert.equal('Mapbox Streets V2', source.data.name);
            assert.equal(0, source.data.minzoom);
            assert.equal(14, source.data.maxzoom);
            assert.ok(!!source.style);
            done();
        });
    });
    it('loads via http', function (done) {
        source('http://a.tiles.mapbox.com/v3/mapbox.mapbox-streets-v4.json', function (err, source) {
            assert.ifError(err);
            assert.equal('Mapbox Streets V4', source.data.name);
            assert.equal(0, source.data.minzoom);
            assert.equal(14, source.data.maxzoom);
            assert.ok(!!source.style);
            done();
        });
    });
    it('loads via https', function (done) {
        source('https://a.tiles.mapbox.com/v3/mapbox.mapbox-streets-v4.json', function (err, source) {
            assert.ifError(err);
            assert.equal('Mapbox Streets V4', source.data.name);
            assert.equal(0, source.data.minzoom);
            assert.equal(14, source.data.maxzoom);
            assert.ok(!!source.style);
            done();
        });
    });
    it('error bad protocol', function(done) {
        source('invalid://www.google.com', function(err, source) {
            assert.ok(err);
            assert.equal('Invalid source protocol', err.message);
            done();
        });
    });
    it('noop remote write', function(done) {
        source.save({id:'mapbox:///mapbox.mapbox-streets-v2'}, function(err, source) {
            assert.ifError(err);
            done();
        });
    });
});

describe('source local', function() {
    var tmp = '/tmp/tm2-source-' + (+new Date);
    var data = {
        name: 'Test source',
        attribution: '&copy; John Doe 2013.',
        minzoom: 0,
        maxzoom: 6,
        Layer: [ {
            id: 'box',
            name: 'box',
            description: '',
            srs: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over',
            properties: {
                'buffer-size': 0,
                minzoom: 0,
                maxzoom: 6
            },
            Datasource: {
                file: __dirname + '/fixtures-localsource/10m-900913-bounding-box.shp',
                type: 'shape'
            }
        } ]
    };
    after(function(done) {
        setTimeout(function() {
            ['data.xml','data.yml'].forEach(function(file) {
                try { fs.unlinkSync(tmp + '/' + file) } catch(err) {};
            });
            try { fs.rmdirSync(tmp) } catch(err) {};
            try { fs.unlinkSync(tmp + '.tm2z') } catch(err) {};
            done();
        }, 250);
    });
    it('loads', function(done) {
        source('tmsource://' + __dirname + '/fixtures-localsource', function(err, source) {
            assert.ifError(err);
            assert.equal('Test source', source.data.name);
            assert.equal(0, source.data.minzoom);
            assert.equal(6, source.data.maxzoom);
            assert.ok(!!source.style);
            done();
        });
    });
    it('loads via tilelive', function(done) {
        tilelive.load('tmsource://' + __dirname + '/fixtures-localsource', function(err, source) {
            assert.ifError(err);
            assert.equal('Test source', source.data.name);
            assert.equal(0, source.data.minzoom);
            assert.equal(6, source.data.maxzoom);
            assert.ok(!!source.style);
            done();
        });
    });
    it('saves source in memory', function(done) {
        source.save(_({id:'tmsource:///tmp-12345678'}).defaults(data), function(err, source) {
            assert.ifError(err);
            assert.ok(source);
            done();
        });
    });
    it('saves source to disk', function(done) {
        source.save(_({id:'tmsource://' + tmp}).defaults(data), function(err, source) {
            assert.ifError(err);
            assert.ok(source);
            assert.ok(/maxzoom: 6/.test(fs.readFileSync(tmp + '/data.yml', 'utf8')), 'saves data.yml');
            assert.ok(/<Map srs/.test(fs.readFileSync(tmp + '/data.xml', 'utf8')), 'saves data.xml');
            // This setTimeout is here because thumbnail generation on save
            // is an optimistic operation (e.g. callback does not wait for it
            // to complete).
            setTimeout(function() {
                assert.ok(fs.existsSync(tmp + '/.thumb.png'), 'saves thumb');
                done();
            }, 1000);
        });
    });
});

});
