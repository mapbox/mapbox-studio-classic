var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var tm = require('../lib/tm');
var style = require('../lib/style');
var defpath = path.dirname(require.resolve('tm2-default-style'));

describe('style', function() {

var tmppath = '/tmp/tm2-test-' + +new Date;
before(function(done) {
    tm.config({
        db: path.join(tmppath, 'app.db'),
        cache: path.join(tmppath, 'cache')
    }, done());
});
after(function(done) {
    try { fs.unlinkSync(path.join(tmppath, 'app.db')); } catch(err) {}
    try { fs.rmdirSync(path.join(tmppath, 'cache')); } catch(err) {}
    try { fs.rmdirSync(tmppath); } catch(err) {}
    done();
});

describe('style load', function() {
    var tmpPerm = '/tmp/tm2-perm-' + (+new Date);
    var data = {
        name:'tmp-1234',
        source:'mapbox:///mapbox.mapbox-streets-v2',
        styles:{
            'a.mss': '#water { polygon-fill:#fff }',
            'b.mss': '#landuse { polygon-fill:#000 }'
        }
    };
    after(function(done) {
        setTimeout(function() {
            ['project.xml','project.yml','a.mss','b.mss','.thumb.png'].forEach(function(file) {
                try { fs.unlinkSync(tmpPerm + '/' + file) } catch(err) {};
            });
            try { fs.rmdirSync(tmpPerm) } catch(err) {};
            try { fs.unlinkSync(tmpPerm + '.tm2z') } catch(err) {};
            done();
        }, 250);
    });
    it('loads default style from disk', function(done) {
        style('tmstyle:///' + defpath, function(err, proj) {
            assert.ifError(err);
            assert.ok('style.mss' in proj.data.styles, 'style load expands stylesheets');
            assert.equal(proj.data.background, 'rgba(255,255,255,1.00)', 'style load determines map BG color');
            done();
        });
    });
    it('saves style in memory', function(done) {
        style.save(_({id:'tmstyle:///tmp-12345678'}).defaults(data), function(err, source) {
            assert.ifError(err);
            assert.ok(source);
            done();
        })
    });
    it('saves style to disk', function(done) {
        style.save(_({id:'tmstyle://' + tmpPerm}).defaults(data), function(err, source) {
            assert.ifError(err);
            assert.ok(source);
            assert.ok(/maxzoom: 22/.test(fs.readFileSync(tmpPerm + '/project.yml', 'utf8')), 'saves project.yml');
            assert.equal(data.styles['a.mss'], fs.readFileSync(tmpPerm + '/a.mss', 'utf8'), 'saves a.mss');
            assert.equal(data.styles['b.mss'], fs.readFileSync(tmpPerm + '/b.mss', 'utf8'), 'saves b.mss');
            assert.ok(/<Map srs/.test(fs.readFileSync(tmpPerm + '/project.xml', 'utf8')), 'saves project.xml');
            // This setTimeout is here because thumbnail generation on save
            // is an optimistic operation (e.g. callback does not wait for it
            // to complete).
            setTimeout(function() {
                assert.ok(fs.existsSync(tmpPerm + '/.thumb.png'), 'saves thumb');
                done();
            }, 500);
        })
    });
    it ('packages style to tm2z', function(done) {
        style.toPackage('tmstyle://' + tmpPerm, tmpPerm + '.tm2z', function(err) {
            assert.ifError(err);
            var stat = fs.statSync(tmpPerm + '.tm2z');
            assert.ok(fs.existsSync(tmpPerm + '.tm2z'));
            assert.ok(stat.isFile(), 'writes file');
            assert.ok(846, stat.size, 'with correct size');
            require('child_process').exec('tar -ztf ' + tmpPerm + '.tm2z', function(err, stdout, stderr) {
                assert.ifError(err, 'tar succeeds in reading tm2z');
                assert.equal('', stderr, 'without errors');
                assert.ok(/\/project.xml/.test(stdout), 'lists files');
                done();
            });
        });
    });
});

describe('style.info', function() {
    it('fails on bad path', function(done) {
        style.info('tmstyle:///path/does/not/exist', function(err, info) {
            assert.ok(err);
            assert.equal('ENOENT', err.code);
            done();
        });
    });
    it('reads style YML', function(done) {
        style.info('tmstyle://' + defpath, function(err, info) {
            assert.ifError(err);
            assert.equal(info.minzoom, 0);
            assert.equal(info.maxzoom, 22);
            assert.equal(info.source, 'mapbox:///mapbox.mapbox-streets-v4');
            assert.ok(/background-color:#fff/.test(info.styles['style.mss']));
            assert.equal(info.id, 'tmstyle://' + defpath, 'style.info adds id key');
            done();
        });
    });
    it('resolves self-alias', function(done) {
        style.info('tmstyle://' + __dirname + '/fixtures-localsource', function(err, info) {
            assert.ifError(err);
            assert.equal('tmsource://' + __dirname + '/fixtures-localsource', info.source);
            done();
        });
    });

});

describe('style.toXML', function() {
    it('fails on invalid source', function(done) {
        style.toXML({
            id:'tmstyle:///tmp-1234',
            source:'tmsource:///foobar'
        }, function(err, xml) {
            assert.ok(err);
            assert.equal('ENOENT', err.code);
            done();
        });
    });
    it('compiles', function(done) {
        style.toXML({
            id:'tmstyle:///tmp-1234',
            source:'mapbox:///mapbox.mapbox-streets-v2',
            styles:{'style.mss': '#water { polygon-fill:#fff }'},
            _properties:{bridge:{'group-by':'layer'}}
        }, function(err, xml) {
            assert.ifError(err);
            assert.ok(/<Map srs/.test(xml), 'looks like Mapnik XML');
            assert.ok(/<Layer name="water"/.test(xml), 'includes layer');
            assert.ok(/group-by="layer"/.test(xml), 'includes layer properties');
            assert.ok(/<PolygonSymbolizer fill="#ffffff"/.test(xml), 'includes rule');
            assert.ok(xml.indexOf('<Layer name="road"') < xml.indexOf('<Layer name="bridge"'));
            done();
        });
    });
    it('compiles layer order + classed layers', function(done) {
        style.toXML({
            id:'tmstyle:///tmp-1234',
            source:'mapbox:///mapbox.mapbox-streets-v2',
            styles:{'style.mss': '#water { polygon-fill:#fff } #road.line::line { line-width:0.5 } #road.label::label { line-width:1 }'},
            layers:[ 'water', 'bridge', 'poi_label', 'road.line', 'tunnel', 'road.label' ],
            _properties:{bridge:{'group-by':'layer'}}
        }, function(err, xml) {
            assert.ifError(err);
            assert.ok(/<Map srs/.test(xml), 'looks like Mapnik XML');
            assert.ok(/<Layer name="water"/.test(xml), 'includes layer');
            assert.ok(/group-by="layer"/.test(xml), 'includes layer properties');
            assert.ok(/<PolygonSymbolizer fill="#ffffff"/.test(xml), 'includes rule');
            // Moves specified layers last, in order.
            assert.ok(xml.indexOf('<Layer name="road"') > xml.indexOf('<Layer name="poi_label"'));
            assert.ok(xml.indexOf('<Layer name="road"') > xml.indexOf('<Layer name="road_label"'));
            assert.ok(xml.indexOf('<Layer name="tunnel"') > xml.indexOf('<Layer name="road"'));
            assert.ok(xml.indexOf('<StyleName>road-label</StyleName>') > xml.indexOf('<StyleName>road-line</StyleName>'));
            done();
        });
    });
    it('compiles data params', function(done) {
        style.toXML({
            id:'tmstyle:///tmp-1234',
            source:'mapbox:///mapbox.mapbox-streets-v2',
            name:'test',
            description:'test style',
            attribution:'test',
            bounds:[-180,-85,180,85],
            center:[0,0,3],
            minzoom:0,
            maxzoom:22,
            customproperty:'foobar'
        }, function(err, xml) {
            assert.ifError(err);
            assert.ok(/<Map srs/.test(xml));
            assert.ok(/<Parameter name="name"/.test(xml));
            assert.ok(/<Parameter name="description"/.test(xml));
            assert.ok(/<Parameter name="attribution"/.test(xml));
            assert.ok(/<Parameter name="bounds">-180,-85,180,85/.test(xml));
            assert.ok(/<Parameter name="center">0,0,3/.test(xml));
            assert.ok(/<Parameter name="minzoom">0/.test(xml));
            assert.ok(/<Parameter name="maxzoom">22/.test(xml));
            assert.ok(/<Parameter name="source"><\!\[CDATA\[mapbox:\/\/\/mapbox.mapbox-streets-v2\]\]>/.test(xml));
            assert.ok(!/<Parameter name="custom/.test(xml));
            done();
        });
    });
});

});
