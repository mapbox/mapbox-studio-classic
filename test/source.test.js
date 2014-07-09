var stream = require('stream');
var test = require('tape');
var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var tm = require('../lib/tm');
var source = require('../lib/source');
var tilelive = require('tilelive');
var mockOauth = require('../lib/mapbox-mock')(require('express')());
var creds = {
    account: 'test',
    accesstoken: 'testaccesstoken'
};
var tmp = require('os').tmpdir();
var UPDATE = !!process.env.UPDATE;
var server;
var tmppath = path.join(tmp, 'tm2-sourceTest-' + +new Date);
var tmpPerm = path.join(tmp, 'tm2-sourcePerm-' + (+new Date));
var tmpSpace = path.join(tmp, 'tm2-source ' + (+new Date));
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

test('setup: config', function(t) {
    tm.config({
        db: path.join(tmppath, 'app.db'),
        tmp: path.join(tmppath, 'tmp'),
        cache: path.join(tmppath, 'cache')
    }, t.end);
});

test('setup: mockserver', function(t) {
    tm.db.set('oauth', creds);
    tm._config.mapboxtile = 'http://localhost:3001/v4';
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
    source('http://a.tiles.mapbox.com/v3/mapbox.mapbox-streets-v4.json', function (err, source) {
        t.ifError(err);
        t.equal('Mapbox Streets V4', source.data.name);
        t.equal(0, source.data.minzoom);
        t.equal(14, source.data.maxzoom);
        t.ok(!!source.style);
        t.end();
    });
});

test('remote: loads via https', function(t) {
    source('https://a.tiles.mapbox.com/v3/mapbox.mapbox-streets-v4.json', function (err, source) {
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

test('remote: noop remote write', function(t) {
    source.save({id:'mapbox:///mapbox.mapbox-streets-v2'}, function(err, source) {
        t.ifError(err);
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

test('local: saves source in memory', function(t) {
    source.save(_({id:'tmsource:///tmp-12345678'}).defaults(data), function(err, source) {
        t.ifError(err);
        t.ok(source);
        t.end();
    });
});

test('local: saves source to disk', function(t) {
    source.save(_({id:'tmsource://' + tmpPerm}).defaults(data), function(err, source) {
        t.ifError(err);
        t.ok(source);

        // Windows filepaths can lead to dramatically different yaml fixtures
        // than unix paths. This is not just because of backslashes but also
        // the c: drivename which leads to use of double quotes in yaml.
        // Normalize all this nonsense before following through with basepath
        // replacement for fixture comparison + creation.
        var yaml = require('js-yaml');
        var ymldirname = yaml.dump(__dirname).trim().replace(/"/g,'');

        var datayml = fs.readFileSync(tmpPerm + '/data.yml', 'utf8').replace(ymldirname,'BASEPATH');
        var dataxml = fs.readFileSync(tmpPerm + '/data.xml', 'utf8').replace(__dirname,'BASEPATH');

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
            t.ok(fs.existsSync(tmpPerm + '/.thumb.png'), 'saves thumb');
            t.end();
        }, 1000);
    });
});

test('local: saves source with space', function(t) {
    source.save(_({id:'tmsource://' + tmpSpace}).defaults(data), function(err, source) {
        t.ifError(err);
        fs.stat(tmpSpace, function(err, stat) {
            t.ifError(err);
            t.end();
        });
    });
});

test('local: cleanup', function(t) {
    setTimeout(function() {
        ['data.xml','data.yml'].forEach(function(file) {
            try { fs.unlinkSync(tmpPerm + '/' + file) } catch(err) {};
            try { fs.unlinkSync(tmpSpace + '/' + file) } catch(err) {};
        });
        try { fs.rmdirSync(tmpPerm) } catch(err) {};
        try { fs.rmdirSync(tmpSpace) } catch(err) {};
        try { fs.unlinkSync(tmpPerm + '.tm2z') } catch(err) {};
        try { fs.unlinkSync(tmpSpace + '.tm2z') } catch(err) {};
        t.end();
    }, 250);
});

test('source.info: fails on bad path', function(t) {
    source.info('tmsource:///path/does/not/exist', function(err, info) {
        t.ok(err);
        t.equal('ENOENT', err.code);
        t.end();
    });
});

test('source.info: reads source YML', function(t) {
    source.info('tmsource://' + __dirname + '/fixtures-localsource', function(err, info) {
        t.ifError(err);
        t.equal(info.id, 'tmsource://' + __dirname + '/fixtures-localsource', 'source.info adds id key');

        info.id = '[id]';

        var filepath = __dirname + '/expected/source-info.json';
        if (UPDATE) {
            fs.writeFileSync(filepath, JSON.stringify(info, null, 2).replace(__dirname, '[basepath]'));
        }
        t.deepEqual(info, require(filepath));
        t.end();
    });
});

test('source.mbtilesExport: exports mbtiles file', function(t) {
    var id = 'tmsource://' + __dirname + '/fixtures-export';
    source.toHash(id, function(err, hash) {
        t.ifError(err);
        t.equal(false, fs.existsSync(hash), 'export does not exist yet');
        var task = source.mbtilesExport(id);
        t.strictEqual(task.id, id, 'sets task.id');
        t.ok(task.progress instanceof stream.Duplex, 'sets task.progress');
        task.progress.once('finished', function() {
            t.equal(task.progress.progress().percentage, 100, 'progress.percentage');
            t.equal(task.progress.progress().transferred, 342, 'progress.transferred');
            t.equal(task.progress.progress().eta, 0, 'progress.eta');
            t.equal(true, fs.existsSync(hash), 'export moved into place');
            t.end();
        });
    });
});

test('source.mbtilesExport: verify export', function(t) {
    var MBTiles = require('mbtiles');
    var id = 'tmsource://' + __dirname + '/fixtures-export';
    source.toHash(id, function(err, hash) {
        t.ifError(err);
        new MBTiles(hash, function(err, src) {
            t.ifError(err);
            src._db.get('select count(1) as count, sum(length(tile_data)) as size from tiles;', function(err, row) {
                t.ifError(err);
                t.equal(row.count, 341);
                t.equal(row.size, 22245);
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
                    t.deepEqual(JSON.parse(fs.readFileSync(__dirname + '/expected/source-export-info.json')), info);
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

test('cleanup', function(t) {
    try { fs.unlinkSync(path.join(tmppath, 'app.db')); } catch(err) {}
    try { fs.rmdirSync(path.join(tmppath, 'cache')); } catch(err) {}
    try { fs.rmdirSync(path.join(tmppath, 'tmp')); } catch(err) {}
    try { fs.rmdirSync(tmppath); } catch(err) {}
    server.close(function() {
        t.end();
    });
});

