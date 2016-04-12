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

var localreprojectedsource = 'tmsource://' + path.join(__dirname,'fixtures-local-reprojected source');
var tmppath = tm.join(tmp, 'Source ШЖФ - ' + +new Date);

test('setup: config ' + __filename, function(t) {
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
    tm.db.set('MapboxAPIAuth', 'http://localhost:3001');
    tm.db.set('MapboxAPITile', 'http://localhost:3001');
    server = mockOauth.listen(3001, t.end);
});

test('source.normalize', function(t) {
    var n = source.normalize({
        id: 'tmsource://' + __dirname + '/fixtures-local-reprojected source',
        Layer: [{
            id: 'NZ_Coastline_NZMG',
            fields: {
                featurecla: 'String',
                scalerank: 'Number'
            },
            Datasource: {
                type: 'shape',
                file: __dirname + '/fixtures-local-reprojected source/NZ_Coastline_NZMG',
                bogus: 'true'
            }
        }]
    });
    t.deepEqual(n.Layer.length, 1);
    t.deepEqual(n.vector_layers.length, 1);
    t.deepEqual(n.vector_layers[0].fields, {'featurecla': 'String', 'scalerank': 'Number'},
        'Populates field help');
    t.deepEqual(Object.keys(tm.sortkeys(n.Layer[0])), ['id','Datasource','description','fields','properties','srs'],
        'Populates deep defaults in Layer objects');
    t.deepEqual(Object.keys(tm.sortkeys(n.Layer[0].Datasource)), ['file','type'],
        'Strips invalid datasource properties based on type');
    t.end();
});

test('source export: setup reprojected', function(t) {
    testutil.createTmpProject('source-export-reprojected', localreprojectedsource, function(err, tmpid) {
        t.ifError(err);
        t.end();
    });
});

test('source.mbtilesExport: exports reprojected mbtiles file', function(t) {
    testutil.createTmpProject('source-export-reprojected', localreprojectedsource, function(err, id) {
    t.ifError(err);

    source.toHash(id, function(err, hash) {
        t.ifError(err);
        t.equal(false, fs.existsSync(hash), 'export does not exist yet');
        var task = source.mbtilesExport(id);
        t.strictEqual(task.id, id, 'sets task.id');
        t.ok(task.progress instanceof stream.Duplex, 'sets task.progress');
        task.progress.once('finished', function() {
            t.equal(task.progress.progress().percentage, 100, 'progress.percentage');
            t.equal(task.progress.progress().transferred, 20, 'progress.transferred');
            t.equal(task.progress.progress().eta, 0, 'progress.eta');
            t.equal(true, fs.existsSync(hash), 'export moved into place');
            t.end();
        });
    });

    });
});

test('source.mbtilesExport: verify reprojected export', function(t) {
    testutil.createTmpProject('source-export-reprojected', localreprojectedsource, function(err, id) {
    t.ifError(err);

    var MBTiles = require('mbtiles');
    source.toHash(id, function(err, hash) {
        t.ifError(err);
        new MBTiles({ pathname: hash }, function(err, src) {
            t.ifError(err);
            src._db.get('select count(1) as count, sum(length(tile_data)) as size from tiles;', function(err, row) {
                t.ifError(err);
                t.equal(row.count, 19);
                // may shift slightly per node-mapnik release
                t.ok(row.size > 3000 && row.size < 4000);
                check([
                    [0,0,0],
                    [1,1,1],
                    [2,3,2],
                    [3,7,5],
                    [3,7,4],
                    [4,15,10],
                    [4,15,9],
                    [5,30,20],
                    [5,31,20],
                    [5,31,19],
                    [6,61,41],
                    [6,61,40],
                    [6,62,41]
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
                        fs.writeFileSync(__dirname + '/expected/source-export-reprojected-info.json', JSON.stringify(info, null, 2));
                    }
                    t.deepEqual(info, JSON.parse(fs.readFileSync(__dirname + '/expected/source-export-reprojected-info.json')));
                    t.end();
                });
                var zxy = queue.shift();
                src.getTile(zxy[0],zxy[1],zxy[2], function(err, buffer) {
                    t.ok(!err && !!buffer, zxy.join('/'));
                    check(queue);
                });
            }
            });
        });
    });
});

test('source.mbtilesUpload: uploads reprojected map', function(t) {
    testutil.createTmpProject('source-export-reprojected', localreprojectedsource, function(err, id) {
        t.ifError(err);
        source.upload(id, false, function(err, task) {
            t.ifError(err);
            t.strictEqual(task.id, id, 'sets task.id');
            t.ok(task.progress instanceof stream.Duplex, 'sets task.progress');
            // returns a task object with active progress
            task.progress.on('error', function(err){
                t.ifError(err);
                t.end();
            });
            task.progress.on('finished', function(p){
                t.equal(task.progress.progress().percentage, 100, 'progress.percentage');
                t.equal(task.progress.progress().eta, 0, 'progress.eta');
                t.end()
            });
        });
    });
});

test('cleanup ' + __filename, function(t) {
    server.close(function() {
        setTimeout(function () {
            t.end();
        }, 1000);

    });
});
