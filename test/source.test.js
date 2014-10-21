var stream = require('stream');
var test = require('tape');
var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var upload = require('mapbox-upload');
var tm = require('../lib/tm');
var source = require('../lib/source');
var tilelive = require('tilelive');
var testutil = require('./util');
var mockOauth = require('../lib/mapbox-mock')(require('express')());
var creds = {
    account: 'test',
    accesstoken: 'testaccesstoken'
};
var tmp = tm.join(require('os').tmpdir(),'mapbox-studio');
var UPDATE = !!process.env.UPDATE;
var server;

var defaultsource = 'tmsource://' + tm.join(path.dirname(require.resolve('mapbox-studio-default-source')));
var localsource = 'tmsource://' + path.join(__dirname,'fixtures-localsource');
var tmppath = tm.join(tmp, 'Source ШЖФ - ' + +new Date);

test('setup: config', function(t) {
    tm.config({
        log: false,
        db: path.join(tmppath, 'app.db'),
        tmp: path.join(tmppath, 'tmp'),
        fonts: path.join(tmppath, 'fonts'),
        cache: path.join(tmppath, 'cache')
    }, t.end);
});

test('setup: mockserver', function(t) {
    tm.db.set('oauth', creds);
    tm._config.MapboxAuth = 'http://localhost:3001',
    tm._config.MapboxTile = 'http://localhost:3001/v4';
    server = mockOauth.listen(3001, t.end);
});

test('source.normalize', function(t) {
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
    t.deepEqual(n.Layer.length, 1);
    t.deepEqual(n.vector_layers.length, 1);
    t.deepEqual(n.vector_layers[0].fields, {'Id':'Valid helptext for a field'},
        'Populates field help');
    t.deepEqual(Object.keys(tm.sortkeys(n.Layer[0])), ['id','Datasource','description','fields','properties','srs'],
        'Populates deep defaults in Layer objects');
    t.deepEqual(Object.keys(tm.sortkeys(n.Layer[0].Datasource)), ['file','type'],
        'Strips invalid datasource properties based on type');

    // Throws for bad datasource type.
    t.throws(function() {
        source.normalize({ Layer: [{ Datasource: { type: 'xboxlive' } }] });
    }, /Invalid datasource type/);

    // Throws if datasource is missing required fields.
    t.throws(function() {
        source.normalize({ Layer: [{ Datasource: { type: 'shape' } }] });
    }, /Missing required field/);


    // Test a raster source with multiple layers
    n = source.normalize({
        id: 'tmsource://' + __dirname + '/fixtures-localraster',
        Layer: [{
            id: 'raster2',
            fields: {},
            Datasource: {
                type: 'gdal',
                file: __dirname + '/fixtures-localraster/raster2.tif'
            }
        }, {
            id: 'raster1',
            fields: {},
            Datasource: {
                type: 'gdal',
                file: __dirname + '/fixtures-localraster/raster1.tif'
            }
        }]
    });
    t.deepEqual(n.Layer.length, 2, 'raster source contains two layers');
    t.deepEqual(n.vector_layers, undefined, 'raster source contains no vector_layers');

    // Test normalizing metadata for a remote vector source.
    n = source.normalize({
        id: 'mapbox:///mapbox.remote-vector',
        format: 'pbf',
        vector_layers: [{
            id: 'water',
        }, {
            id: 'landuse'
        }]
    });
    t.deepEqual(n.format, 'pbf', 'remote vector source is pbf');
    t.deepEqual(n.vector_layers.length, 2, 'remote vector source preserves vector_layers key');

    // Test normalizing metadata for a remote raster source.
    n = source.normalize({
        id: 'mapbox:///mapbox.remote-raster',
        format: 'webp'
    });
    t.deepEqual(n.format, 'webp', 'remote raster source is webp');
    t.deepEqual(n.vector_layers, undefined, 'remote raster source contains no vector_layers');


    // @TODO check postgis auto srs extent generation ... without postgis.

    t.end();
});

test('remote: fails without oauth', function(t) {
    tm.db.set('oauth', null);
    source('mapbox:///test.oauth-fail-source', function(err, source) {
        t.ok(err);
        t.equal('EOAUTH', err.code);
        tm.db.set('oauth', creds);
        t.end();
    });
});

test('remote: loads', function(t) {
    source('mapbox:///mapbox.mapbox-streets-v2', function(err, source) {
        t.ifError(err);
        t.equal('Mapbox Streets V2', source.data.name);
        t.equal(0, source.data.minzoom);
        t.equal(14, source.data.maxzoom);
        t.ok(!!source.style);
        t.end();
    });
});

test('remote: loads raster', function(t) {
    source('mapbox:///mapbox.satellite', function(err, source) {
        t.ifError(err);
        t.equal('Mapbox Satellite', source.data.name);
        t.equal(0, source.data.minzoom);
        t.equal(19, source.data.maxzoom);
        t.equal(source.data.vector_layers, undefined);
        t.ok(!!source.style);
        t.end();
    });
});

test('remote: loads via tilelive', function(t) {
    tilelive.load('mapbox:///mapbox.mapbox-streets-v2', function(err, source) {
        t.ifError(err);
        t.equal('Mapbox Streets V2', source.data.name);
        t.equal(0, source.data.minzoom);
        t.equal(14, source.data.maxzoom);
        t.ok(!!source.style);
        t.end();
    });
});

test('remote: loads via http', function(t) {
    source('http://localhost:3001/v4/mapbox.mapbox-streets-v4.json?access_token=testaccesstoken', function (err, source) {
        t.ifError(err);
        t.equal('Mapbox Streets V4', source.data.name);
        t.equal(0, source.data.minzoom);
        t.equal(14, source.data.maxzoom);
        t.ok(!!source.style);
        t.end();
    });
});

test.skip('remote: loads via https', function(t) {
    source('https://localhost:3001/v4/mapbox.mapbox-streets-v4.json', function (err, source) {
        t.ifError(err);
        t.equal('Mapbox Streets V4', source.data.name);
        t.equal(0, source.data.minzoom);
        t.equal(14, source.data.maxzoom);
        t.ok(!!source.style);
        t.end();
    });
});

test('remote: error bad protocol', function(t) {
    source('invalid://www.google.com', function(err, source) {
        t.ok(err);
        t.equal('Invalid source protocol', err.message);
        t.end();
    });
});

test('remote: noop refresh', function(t) {
    source.refresh({id:'mapbox:///mapbox.mapbox-streets-v2'}, function(err, source) {
        t.ifError(err);
        t.end();
    });
});

test('remote: save error', function(t) {
    source.save({id:'mapbox:///mapbox.mapbox-streets-v2'}, function(err, source) {
        t.ok(err);
        t.ok(/^Error: Cannot save remote source/.test(err.toString()));
        t.end();
    });
});

test('local: invalid yaml (non-object)', function(t) {
    source('tmsource://' + __dirname + '/fixtures-invalid-nonobj', function(err, source) {
        t.ok(err);
        t.ok(/^Error: Invalid YAML/.test(err.toString()));
        t.end();
    });
});

test('local: invalid yaml', function(t) {
    source('tmsource://' + __dirname + '/fixtures-invalid-yaml', function(err, source) {
        t.ok(err);
        t.ok(/^JS-YAML/.test(err.toString()));
        t.end();
    });
});

test('local: loads', function(t) {
    source('tmsource://' + __dirname + '/fixtures-localsource', function(err, source) {
        t.ifError(err);
        t.equal('Test source', source.data.name);
        t.equal(0, source.data.minzoom);
        t.equal(6, source.data.maxzoom);
        t.ok(!!source.style);
        t.end();
    });
});

test('local: loads via tilelive', function(t) {
    tilelive.load('tmsource://' + __dirname + '/fixtures-localsource', function(err, source) {
        t.ifError(err);
        t.equal('Test source', source.data.name);
        t.equal(0, source.data.minzoom);
        t.equal(6, source.data.maxzoom);
        t.ok(!!source.style);
        t.end();
    });
});

test('local: refresh source in memory', function(t) {
    testutil.createTmpProject('source-save', localsource, function(err, tmpid, info) {
        assert.ifError(err);
        source.refresh(_({id:source.tmpid()}).defaults(info), function(err, source) {
            t.ifError(err);
            t.ok(source);
            t.end();
        });
    });
});

test('local: refresh source (invalid minzoom)', function(t) {
    testutil.createTmpProject('source-save', defaultsource, function(err, tmpid, info) {
        assert.ifError(err);
        source.refresh(_({id:source.tmpid(), minzoom:-1}).defaults(info), function(err, source) {
            assert.equal(err.toString(), 'Error: minzoom must be an integer between 0 and 22', 'source.refresh() errors on invalid source');
            t.end();
        });
    });
});

test('local: refresh source (invalid center)', function(t) {
    testutil.createTmpProject('source-save', defaultsource, function(err, tmpid, info) {
        assert.ifError(err);
        source.refresh(_({id:source.tmpid(), minzoom:3, center:[0,0,0]}).defaults(info), function(err, source) {
            assert.equal(err.toString(), 'Error: center zoom value must be greater than or equal to minzoom 3', 'source.refresh() errors on invalid source');
            t.end();
        });
    });
});

test('local: save temporary errors', function(t) {
    testutil.createTmpProject('source-save', localsource, function(err, tmpid, info) {
        assert.ifError(err);
        source.save(_({id:source.tmpid()}).defaults(info), function(err, source) {
            t.ok(err);
            t.ok(/^Error: Cannot save temporary source/.test(err.toString()));
            t.end();
        });
    });
});

test('local: saves source to disk', function(t) {
    testutil.createTmpProject('source-save', localsource, function(err, tmpid, data) {
    assert.ifError(err);

    source.save(data, function(err, source) {
        t.ifError(err);
        t.ok(source);

        // Windows filepaths can lead to dramatically different yaml fixtures
        // than unix paths. This is not just because of backslashes but also
        // the c: drivename which leads to use of double quotes in yaml.
        // Normalize all this nonsense before following through with basepath
        // replacement for fixture comparison + creation.
        var yaml = require('js-yaml');
        var dirname = tm.join(__dirname);
        var ymldirname = yaml.dump(dirname).trim().replace(/"/g,'');

        var projectdir = tm.parse(tmpid).dirname;
        var datayml = fs.readFileSync(projectdir + '/data.yml', 'utf8').replace(new RegExp(ymldirname,'g'),'BASEPATH');
        var dataxml = fs.readFileSync(projectdir + '/data.xml', 'utf8').replace(new RegExp(dirname,'g'),'BASEPATH');

        if (UPDATE) {
            fs.writeFileSync(__dirname + '/expected/source-save-data.yml', datayml);
            fs.writeFileSync(__dirname + '/expected/source-save-data.xml', dataxml);
        }

        t.deepEqual(yaml.load(datayml), yaml.load(fs.readFileSync(__dirname + '/expected/source-save-data.yml', 'utf8')));
        t.equal(dataxml, fs.readFileSync(__dirname + '/expected/source-save-data.xml', 'utf8'));

        // This setTimeout is here because thumbnail generation on save
        // is an optimistic operation (e.g. callback does not wait for it
        // to complete).
        setTimeout(function() {
            t.ok(fs.existsSync(projectdir + '/.thumb.png'), 'saves thumb');
            t.end();
        }, 1000);
    });

    });
});

test('local: save as tmp => perm', function(t) {
    var tmpid = 'tmpsource://' + tm.join(__dirname, '/fixtures-localsource');
    source.info(tmpid, function(err, data) {
        t.ifError(err);
        var permid = path.join(tmp, 'source-saveas-' + Math.random().toString(36).split('.').pop());
        source.save(_({_tmp:tmpid, id:permid}).defaults(data), function(err, source) {
            t.ifError(err);
            t.ok(source);
            t.equal(source.data._tmp, false);
            var tmpdir = tm.parse(permid).dirname;
            t.ok(fs.existsSync(tm.join(tmpdir,'data.yml')));
            t.ok(fs.existsSync(tm.join(tmpdir,'data.xml')));
            t.end();
        });
    });
});

test('local: saves source with space', function(t) {
    // proxy assertion via createTmpProject stat check of project saves.
    testutil.createTmpProject('source-save space', localsource, function(err, tmpid, data) {
        assert.ifError(err);
        t.end();
    });
});

test('source.info: fails on bad path', function(t) {
    source.info('tmsource:///path/does/not/exist', function(err, info) {
        t.ok(err);
        t.equal('ENOENT', err.code);
        t.end();
    });
});

test('source.info: reads source YML', function(t) {
    var tmpid = 'tmsource://' + tm.join(__dirname, 'fixtures-localsource');
    source.info(tmpid, function(err, info) {
        t.ifError(err);
        t.equal(info.id, tmpid, 'source.info adds id key');
        t.equal(info._tmp, false, 'style info adds _tmp=false');

        var basepath = tm.parse(tmpid).dirname;
        info.id = info.id.replace(basepath, '[BASEPATH]');

        var filepath = __dirname + '/expected/source-info.json';
        if (UPDATE) {
            fs.writeFileSync(filepath, JSON.stringify(info, null, 2).replace(__dirname, '[basepath]'));
        }
        t.deepEqual(info, require(filepath));
        t.end();
    });
});

test('source.info: reads source YML (tmp)', function(t) {
    var tmpid = 'tmpsource://' + tm.join(__dirname, '/fixtures-localsource');
    source.info(tmpid, function(err, info) {
        t.ifError(err);
        t.equal(info.id, tmpid, 'source.info adds id key');

        var basepath = tm.parse(tmpid).dirname;
        info.id = info.id.replace(basepath, '[BASEPATH]');
        info._tmp = info._tmp.replace(basepath, '[BASEPATH]');

        var filepath = __dirname + '/expected/source-info-tmp.json';
        if (UPDATE) {
            fs.writeFileSync(filepath, JSON.stringify(info, null, 2).replace(__dirname, '[basepath]'));
        }
        t.deepEqual(info, require(filepath));
        t.end();
    });
});

test('source export: setup', function(t) {
    testutil.createTmpProject('source-export', localsource, function(err, tmpid) {
        assert.ifError(err);
        t.end();
    });
});

test('source.mbtilesExport: exports mbtiles file', function(t) {
    testutil.createTmpProject('source-export', localsource, function(err, id) {
    assert.ifError(err);

    source.toHash(id, function(err, hash) {
        t.ifError(err);
        t.equal(false, fs.existsSync(hash), 'export does not exist yet');
        var task = source.mbtilesExport(id);
        t.strictEqual(task.id, id, 'sets task.id');
        t.ok(task.progress instanceof stream.Duplex, 'sets task.progress');
        task.progress.once('finished', function() {
            t.equal(task.progress.progress().percentage, 100, 'progress.percentage');
            t.equal(task.progress.progress().transferred, 5462, 'progress.transferred');
            t.equal(task.progress.progress().eta, 0, 'progress.eta');
            t.equal(true, fs.existsSync(hash), 'export moved into place');
            t.end();
        });
    });

    });
});

test('source.mbtilesExport: verify export', function(t) {
    testutil.createTmpProject('source-export', localsource, function(err, id) {
    assert.ifError(err);

    var MBTiles = require('mbtiles');
    source.toHash(id, function(err, hash) {
        t.ifError(err);
        new MBTiles({ pathname: hash }, function(err, src) {
            t.ifError(err);
            src._db.get('select count(1) as count, sum(length(tile_data)) as size from tiles;', function(err, row) {
                t.ifError(err);
                t.equal(row.count, 5461);
                t.equal(row.size, 377005);
                check([
                    [0,0,0],
                    [1,0,0],
                    [1,1,0],
                    [2,0,1],
                    [2,2,1]
                ]);
            });
            function check(queue) {
                if (!queue.length) return src.getInfo(function(err, info) {
                    t.ifError(err);

                    // Omit id, basename, filesize from fixture check.
                    delete info.id;
                    delete info.basename;
                    delete info.filesize;

                    if (UPDATE) {
                        fs.writeFileSync(__dirname + '/expected/source-export-info.json', JSON.stringify(info, null, 2));
                    }
                    t.deepEqual(info, JSON.parse(fs.readFileSync(__dirname + '/expected/source-export-info.json')));
                    t.end();
                });
                var zxy = queue.shift();
                src.getTile(zxy[0],zxy[1],zxy[2], function(err, buffer) {
                    t.ifError(err);
                    t.ok(!!buffer);
                    check(queue);
                });
            }
        });
    });

    });
});

test('source.mbtilesUpload: uploads map', function(t) {
    testutil.createTmpProject('source-export', localsource, function(err, id) {
    assert.ifError(err);

    source.upload(id, false, function(err, task) {
        t.ifError(err);
        t.strictEqual(task.id, id, 'sets task.id');
        t.ok(task.progress instanceof stream.Duplex, 'sets task.progress');
        // returns a task object with active progress
        task.progress.on('error', function(err){
            t.ifError(err);
        });
        task.progress.on('finished', function(p){
            t.equal(task.progress.progress().percentage, 100, 'progress.percentage');
            t.equal(task.progress.progress().eta, 0, 'progress.eta');
        });

        task.progress.on('finished', function(){
            t.end()
        });
    });

    });
});

test('source.mbtilesUpload: does not allow redundant upload', function(t) {
    testutil.createTmpProject('source-export', localsource, function(err, id) {
    assert.ifError(err);

    source.upload(id, false, function(err, task) {
        t.ifError(err);
        t.equal(task.progress, null, 'progress obj not created');

        source.info(id, function(err, info){
            t.ifError(err);
            t.assert(/test\..{8}/.test(info._prefs.mapid), 'mapid correctly generated');
            // reset mapid to null
            info._prefs.mapid = null;
            source.save(info, function(){
                t.end();
            })
        });
    });

    });
});

test('cleanup', function(t) {
    server.close(function() { t.end(); });
});
