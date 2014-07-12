var test = require('tape');
var stream = require('stream');
var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var url = require('url');
var assert = require('assert');
var tm = require('../lib/tm');
var style = require('../lib/style');
var defpath = path.dirname(require.resolve('tm2-default-style'));
var mockOauth = require('../lib/mapbox-mock')(require('express')());
var Vector = require('tilelive-vector');
var UPDATE = !!process.env.UPDATE;
var tmp = require('os').tmpdir();
var creds = {
    account: 'test',
    accesstoken: 'testaccesstoken'
};

var server;
var tmppath = path.join(tmp, 'tm2-styleTest-' + (+new Date));
var tmpPerm = path.join(tmp, 'tm2-stylePerm-' + (+new Date));
var tmpSpace = path.join(tmp, 'tm2-style ' + (+new Date));

test('setup: config', function(t) {
    tm.config({
        db: path.join(tmppath, 'app.db'),
        fonts: path.join(tmppath, 'fonts'),
        cache: path.join(tmppath, 'cache')
    }, t.end);
});

test('setup: mockserver', function(t) {
    tm.db.set('oauth', creds);
    tm._config.mapboxtile = 'http://localhost:3001/v4';
    server = mockOauth.listen(3001, t.end);
});

var data = {
    name:'tmp-1234',
    source:'mapbox:///mapbox.mapbox-streets-v2',
    styles:{
        'a.mss': '#water { polygon-fill:#fff }',
        'b.mss': '#landuse { polygon-fill:#000 }'
    }
};

test('loads default style from disk', function(t) {
    style('tmstyle://' + defpath, function(err, proj) {
        t.ifError(err);
        t.ok('style.mss' in proj.data.styles, 'style load expands stylesheets');
        t.equal(proj.data.background, 'rgba(255,255,255,1.00)', 'style load determines map BG color');
        t.end();
    });
});

test('saves style in memory', function(t) {
    style.save(_({id:'tmstyle:///tmp-12345678'}).defaults(data), function(err, source) {
        t.ifError(err);
        t.ok(source);
        t.end();
    });
});

test('saves style to disk', function(t) {
    style.save(_({id:'tmstyle://' + tmpPerm}).defaults(data), function(err, source) {
        t.ifError(err);
        t.ok(source);

        var expect = {};
        expect['style-save-project.yml'] = path.join(__dirname,'expected','style-save-project.yml');
        expect['style-save-project.xml'] = path.join(__dirname,'expected','style-save-project.xml');
        expect['style-save-a.mss'] = path.join(__dirname,'expected','style-save-a.mss');
        expect['style-save-b.mss'] = path.join(__dirname,'expected','style-save-b.mss');

        var output = {};
        output['project.yml'] = path.join(tmpPerm,'project.yml');
        output['project.xml'] = path.join(tmpPerm,'project.xml');
        output['a.mss'] = path.join(tmpPerm,'a.mss');
        output['b.mss'] = path.join(tmpPerm,'b.mss');

        if (UPDATE) {
            fs.writeFileSync(expect['style-save-project.yml'], fs.readFileSync(output['project.yml']));
            fs.writeFileSync(expect['style-save-project.xml'], fs.readFileSync(output['project.xml']));
            fs.writeFileSync(expect['style-save-a.mss'], fs.readFileSync(output['a.mss']));
            fs.writeFileSync(expect['style-save-b.mss'], fs.readFileSync(output['b.mss']));
        }

        t.equal(fs.readFileSync(output['project.yml'],'utf8'), fs.readFileSync(expect['style-save-project.yml'],'utf8'));
        t.equal(fs.readFileSync(output['project.xml'],'utf8'), fs.readFileSync(expect['style-save-project.xml'],'utf8'));
        t.equal(fs.readFileSync(output['a.mss'],'utf8'), fs.readFileSync(expect['style-save-a.mss'],'utf8'));
        t.equal(fs.readFileSync(output['b.mss'],'utf8'), fs.readFileSync(expect['style-save-b.mss'],'utf8'));

        // This setTimeout is here because thumbnail generation on save
        // is an optimistic operation (e.g. callback does not wait for it
        // to complete).
        setTimeout(function() {
            t.ok(fs.existsSync(path.join(tmpPerm,'.thumb.png')), 'saves thumb');
            t.end();
        }, 500);
    });
});

test('saves style with space', function(t) {
    style.save(_({id:'tmstyle://' + tmpSpace}).defaults(data), function(err, source) {
        t.ifError(err);
        fs.stat(tmpSpace, function(err, stat) {
            t.ifError(err);
            t.end();
        });
    });
});

test('packages style to tm2z', function(t) {
    style.toPackage('tmstyle://' + tmpPerm, tmpPerm + '.tm2z', function(err) {
        t.ifError(err);
        var stat = fs.statSync(tmpPerm + '.tm2z');
        t.ok(fs.existsSync(tmpPerm + '.tm2z'));
        t.ok(stat.isFile(), 'writes file');
        t.ok(846, stat.size, 'with correct size');
        Vector.tm2z(url.parse('tm2z://' + tmpPerm + '.tm2z'), function(err, source) {
            t.ifError(err, 'tilelive-vector succeeds in reading tm2z');
            t.ok(source);
            t.end();
        });
    });
});

test('fails to package tmp style', function(t) {
    style.toPackage('tmstyle:///tmp-e31db7cd.tm2z', tmpPerm + '.tm2z', function(err) {
        t.ok(err);
        t.equal('Error: temporary style must be saved first', err.toString());
        t.end();
    });
});

test('style: cleanup', function(t) {
    setTimeout(function() {
        ['project.xml','project.yml','a.mss','b.mss','.thumb.png'].forEach(function(file) {
            try { fs.unlinkSync(path.join(tmpPerm,file)) } catch(err) {};
            try { fs.unlinkSync(path.join(tmpSpace,file)) } catch(err) {};
        });
        try { fs.rmdirSync(tmpPerm) } catch(err) {};
        try { fs.rmdirSync(tmpSpace) } catch(err) {};
        try { fs.unlinkSync(tmpPerm + '.tm2z') } catch(err) {};
        try { fs.unlinkSync(tmpSpace + '.tm2z') } catch(err) {};
        t.end();
    }, 250);
});

test('style.info: fails on bad path', function(t) {
    style.info('tmstyle:///path/does/not/exist', function(err, info) {
        t.ok(err);
        t.equal('ENOENT', err.code);
        t.end();
    });
});

test('style.info: reads style YML', function(t) {
    style.info('tmstyle://' + defpath, function(err, info) {
        t.ifError(err);
        t.equal(info.id, 'tmstyle://' + defpath, 'style.info adds id key');

        info.id = '[id]';

        var filepath = path.join(__dirname,'expected','style-info-default.json');
        if (UPDATE) {
            fs.writeFileSync(filepath, JSON.stringify(info, null, 2));
        }
        t.deepEqual(info, require(filepath));
        t.end();
    });
});

test('style.info: invalid yaml (non-object)', function(t) {
    style.info('tmstyle://' + path.join(__dirname,'fixtures-invalid-nonobj'), function(err, source) {
        t.ok(err);
        t.ok(/^Error: Invalid YAML/.test(err.toString()));
        t.end();
    });
});

test('style.info: invalid yaml', function(t) {
    style.info('tmstyle://' + path.join(__dirname,'fixtures-invalid-yaml'), function(err, source) {
        t.ok(err);
        t.ok(/^JS-YAML/.test(err.toString()));
        t.end();
    });
});

test('style.toXML: fails on invalid source', function(t) {
    style.toXML({
        id:'tmstyle:///tmp-1234',
        source:'tmsource:///foobar'
    }, function(err, xml) {
        t.ok(err);
        t.equal('ENOENT', err.code);
        t.end();
    });
});

test('style.toXML: compiles', function(t) {
    style.toXML({
        id:'tmstyle:///tmp-1234',
        source:'mapbox:///mapbox.mapbox-streets-v2',
        styles:{'style.mss': '#water { polygon-fill:#fff }'},
        _properties:{bridge:{'group-by':'layer'}}
    }, function(err, xml) {
        t.ifError(err);
        t.ok(/<Map srs/.test(xml), 'looks like Mapnik XML');
        t.ok(/<Layer name="water"/.test(xml), 'includes layer');
        t.ok(/group-by="layer"/.test(xml), 'includes layer properties');
        t.ok(/<PolygonSymbolizer fill="#ffffff"/.test(xml), 'includes rule');
        t.ok(xml.indexOf('<Layer name="road"') < xml.indexOf('<Layer name="bridge"'));
        t.end();
    });
});

test('style.toXML: compiles layer order + classed layers', function(t) {
    style.toXML({
        id:'tmstyle:///tmp-1234',
        source:'mapbox:///mapbox.mapbox-streets-v2',
        styles:{'style.mss': '#water { polygon-fill:#fff } #road.line::line { line-width:0.5 } #road.label::label { line-width:1 }'},
        layers:[ 'water', 'bridge', 'poi_label', 'road.line', 'tunnel', 'road.label' ],
        _properties:{bridge:{'group-by':'layer'}}
    }, function(err, xml) {
        t.ifError(err);
        t.ok(/<Map srs/.test(xml), 'looks like Mapnik XML');
        t.ok(/<Layer name="water"/.test(xml), 'includes layer');
        t.ok(/group-by="layer"/.test(xml), 'includes layer properties');
        t.ok(/<PolygonSymbolizer fill="#ffffff"/.test(xml), 'includes rule');
        // Moves specified layers last, in order.
        t.ok(xml.indexOf('<Layer name="road"') > xml.indexOf('<Layer name="poi_label"'));
        t.ok(xml.indexOf('<Layer name="road"') > xml.indexOf('<Layer name="road_label"'));
        t.ok(xml.indexOf('<Layer name="tunnel"') > xml.indexOf('<Layer name="road"'));
        t.ok(xml.indexOf('<StyleName>road-label</StyleName>') > xml.indexOf('<StyleName>road-line</StyleName>'));
        t.end();
    });
});

test('style.toXML: compiles data params', function(t) {
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
        t.ifError(err);
        t.ok(/<Map srs/.test(xml));
        t.ok(/<Parameter name="name"/.test(xml));
        t.ok(/<Parameter name="description"/.test(xml));
        t.ok(/<Parameter name="attribution"/.test(xml));
        t.ok(/<Parameter name="bounds">-180,-85,180,85/.test(xml));
        t.ok(/<Parameter name="center">0,0,3/.test(xml));
        t.ok(/<Parameter name="minzoom">0/.test(xml));
        t.ok(/<Parameter name="maxzoom">22/.test(xml));
        t.ok(/<Parameter name="source"><\!\[CDATA\[mapbox:\/\/\/mapbox.mapbox-streets-v2\]\]>/.test(xml));
        t.ok(!/<Parameter name="custom/.test(xml));
        t.end();
    });
});

test('style.upload: uploads stylesheet', function(t) {
    var id = 'tmstyle://' + __dirname + '/fixtures-upload';
    style.upload({
        id: id,
        oauth: {
            account: 'test',
            accesstoken: 'validtoken'
        },
        cache: path.join(tmppath, 'cache'),
        mapbox: 'http://localhost:3001'
    },
    function(err, info){
        t.ifError(err);
        t.assert(true, 'uploads stylesheet')
        t.end();
    });
});

test('cleanup', function(t) {
    try { fs.unlinkSync(path.join(tmppath, 'app.db')); } catch(err) {}
    try { fs.rmdirSync(path.join(tmppath, 'cache')); } catch(err) {}
    try { fs.rmdirSync(tmppath); } catch(err) {}
    server.close(function() {
        t.end();
    });
});

