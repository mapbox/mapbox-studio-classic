var test = require('tape');
var fs = require('fs');
var url = require('url');
var path = require('path');
var assert = require('assert');
var tm = require('../lib/tm');
var applog = require('../lib/log');
var dirty = require('dirty');
var tmppath = tm.join(require('os').tmpdir(), 'mapbox-studio', 'tm-' + +new Date);
var stream = require('stream');
var progress = require('progress-stream');
var UPDATE = process.env.UPDATE;

test('setup: config ' + __filename, function(t) {
    tm.config({
        log: false,
        db: path.join(tmppath, 'app.db'),
        fonts: path.join(tmppath, 'fonts'),
        cache: path.join(tmppath, 'cache')
    }, t.end);
});

test('setup: db', function(t) {
    fs.writeFileSync(path.join(tmppath, 'noncompact.db'), fs.readFileSync(path.join(__dirname, 'fixtures-dirty', 'noncompact.db')));
    fs.writeFileSync(path.join(tmppath, 'broken.db'), fs.readFileSync(path.join(__dirname, 'fixtures-dirty', 'broken.db')));
    fs.writeFileSync(path.join(tmppath, 'schema-v1.db'), fs.readFileSync(path.join(__dirname, 'fixtures-dirty', 'schema-v1.db')));
    fs.writeFileSync(path.join(tmppath, 'schema-v2.db'), fs.readFileSync(path.join(__dirname, 'fixtures-dirty', 'schema-v2.db')));
    fs.writeFileSync(path.join(tmppath, 'schema-v3.db'), fs.readFileSync(path.join(__dirname, 'fixtures-dirty', 'schema-v3.db')));
    t.end();
});

[1,2,3].forEach(function(v) {
    test('tm migrate v' + v, function(t) {
        var dbpath = path.join(tmppath, 'schema-v'+v+'.db');
        var db = dirty(dbpath);
        db.once('load', function() {
            var docs = {};
            tm.dbmigrate(db);
            db.forEach(function(k,v) { docs[k] = v });
            t.deepEqual({
                version: 4,
                history: [
                    'tmstyle:///no-protocol/path/style.tm2',
                    'mapbox:///mapbox.mapbox-streets-v2'
                ]
            }, docs);
            t.end();
        });
    });
});

test('tm compacts', function(t) {
    var dbpath = path.join(tmppath, 'noncompact.db');
    t.equal(276, fs.statSync(dbpath).size);
    tm.dbcompact(dbpath, function(err, db) {
        t.ifError(err);
        t.equal(db.get('test'), 4, 'has right value');
        t.equal(23, fs.statSync(dbpath).size);
        t.end();
    });
});

test('tm compacts nofile', function(t) {
    var dbpath = path.join(tmppath, 'doesnotexist.db');
    t.equal(false, fs.existsSync(dbpath));
    tm.dbcompact(dbpath, function(err, db) {
        t.ifError(err);
        t.equal(db.get('test'), undefined, 'has no value');
        db.set('test', 1);
        db.on('drain', function() {
            t.equal(23, fs.statSync(dbpath).size);
            t.end();
        });
    });
});

test('tm compacts broken', function(t) {
    var dbpath = path.join(tmppath, 'broken.db');
    t.equal(277, fs.statSync(dbpath).size);
    tm.dbcompact(dbpath, function(err, db) {
        t.ifError(err);
        t.equal(db.get('test'), 4, 'has right value');
        t.equal(23, fs.statSync(dbpath).size);
        t.end();
    });
});

test('tm sortkeys', function(t) {
    t.deepEqual(['id', 'bar', 'foo'], Object.keys(tm.sortkeys({
        foo: 'foo',
        bar: 'bar',
        id: 'id'
    })));
    t.end();
});

test('tm filterkeys', function(t) {
    t.deepEqual({apples:true,bananas:true}, tm.filterkeys({
        apples: true,
        bananas: true,
        vegetables: true
    }, {apples:'', bananas:''}));
    t.end();
});

test('tm dirfiles', function(t) {
    var platform = require('os').platform();
    var dirname = tm.join(__dirname);
    if (platform === 'linux' || platform === 'darwin') {
        fs.symlinkSync('broken',path.join(__dirname,'fixtures-local source','broken-symlink'));
        t.ok(fs.existsSync(__dirname,'fixtures-local source','broken-symlink'));
    }
    tm.dirfiles(dirname + '/fixtures-local source', function(err, files) {
        t.ifError(err);
        t.deepEqual([
            '10m-900913-bounding-box.dbf',
            '10m-900913-bounding-box.prj',
            '10m-900913-bounding-box.shp',
            '10m-900913-bounding-box.shx',
            '10m_lakes_historic.dbf',
            '10m_lakes_historic.prj',
            '10m_lakes_historic.shp',
            '10m_lakes_historic.shx',
            'data.yml',
            'project.yml'
        ], files.map(function(f) { return f.basename }));
        // Confirm that paths are normalized on windows.
        t.deepEqual([
            dirname + '/fixtures-local source/10m-900913-bounding-box.dbf',
            dirname + '/fixtures-local source/10m-900913-bounding-box.prj',
            dirname + '/fixtures-local source/10m-900913-bounding-box.shp',
            dirname + '/fixtures-local source/10m-900913-bounding-box.shx',
            dirname + '/fixtures-local source/10m_lakes_historic.dbf',
            dirname + '/fixtures-local source/10m_lakes_historic.prj',
            dirname + '/fixtures-local source/10m_lakes_historic.shp',
            dirname + '/fixtures-local source/10m_lakes_historic.shx',
            dirname + '/fixtures-local source/data.yml',
            dirname + '/fixtures-local source/project.yml'
        ], files.map(function(f) { return f.path }));
        if (platform === 'linux' || platform === 'darwin') {
            fs.unlinkSync(path.join(dirname,'fixtures-local source','broken-symlink'));
        }
        t.end();
    });
});

test('tm dirfiles windows root', function(t) {
    var platform = require('os').platform();
    if (platform === 'win32') {
        tm.dirfiles('/', function(err, files) {
            t.ifError(err);
            t.deepEqual(
                files
                    .filter(function(f) { return (-1 < f.basename.indexOf('c')) })
                    .map(function(f){ return f.path }),
                [
                    'c:\\'
                ]
            );
            t.end();
        });
    } else {
        t.end();
    }
});

// @TODO tm.writefiles

test('tm history', function(t) {
    var defaultSources = [
        'mapbox:///mapbox.mapbox-streets-v5',
        'mapbox:///mapbox.mapbox-terrain-v1,mapbox.mapbox-streets-v5',
        'mapbox:///mapbox.satellite,mapbox.mapbox-streets-v5'
    ];
    t.throws(function() {
        tm.history('badprotocol://xyz')
    });
    t.deepEqual(defaultSources, tm.history(),
        'Inits with defaults');
    t.deepEqual([].concat(defaultSources).concat(['tmstyle:///foo']), tm.history('tmstyle:///foo'),
        'Sets style');
    t.deepEqual([].concat(defaultSources).concat(['tmstyle:///foo']), tm.history(),
        'Confirm set');
    t.deepEqual([].concat(defaultSources).concat(['tmstyle:///foo','tmsource:///bar']), tm.history('tmsource:///bar'),
        'Sets source');
    t.deepEqual([].concat(defaultSources).concat(['tmstyle:///foo','tmsource:///bar']), tm.history(),
        'Confirm set');
    t.deepEqual([].concat(defaultSources).concat(['tmstyle:///foo','tmsource:///bar']), tm.history('tmsource:///bar'),
        'Ignores duplicates');
    t.deepEqual([].concat(defaultSources).concat(['tmstyle:///foo']), tm.history('tmsource:///bar', true),
        'Invalidates source');
    t.deepEqual([].concat(defaultSources).concat(['tmstyle:///foo']), tm.history(),
        'Confirm invalidation');
    t.deepEqual([].concat(defaultSources).concat(['tmstyle:///foo']), tm.history('mapbox:///mapbox.mapbox-streets-v5', true),
        'Cannot invalidate default source');

    // Windows path testing.
    var sep = path.sep;
    path.sep = '\\';
    t.deepEqual([].concat(defaultSources).concat(['tmstyle:///foo','tmstyle://c:/Windows/Path']), tm.history('tmstyle://c:\\Windows\\Path'),
        'Normalizes windows path');
    t.deepEqual([].concat(defaultSources).concat(['tmstyle:///foo','tmstyle://c:/Windows/Path']), tm.history('tmstyle://C:/Windows/Path'),
        'Normalizes drive case in windows path');
    path.sep = sep;

    t.end();
});

test('tm font (invalid)', function(t) {
    tm.font('doesnotexist', '', undefined, function(err) {
        t.equal('Invalid font doesnotexist', err.message);
        t.end();
    });
});

test('tm font (valid)', function(t) {
    tm.font('Source Sans Pro Bold', '', undefined, function(err, buffer) {
        t.ifError(err);
        t.ok(buffer.length > 1200 && buffer.length < 2000, ' valid font size');
        setTimeout(function() {
            t.ok(fs.existsSync(path.join(tm.config().cache, 'font-b4c92d28.png')));
            t.end();
        }, 2000);
    });
});

test('tm font (cache hit)', function(t) {
    tm.font('Source Sans Pro Bold', '', undefined, function(err, buffer) {
        t.ifError(err);
        t.ok(buffer.length > 1200 && buffer.length < 2000, ' valid font size');
        t.ok(buffer.hit);
        t.end();
    });
});

test('tm font (fontdir)', function(t) {
    tm.font('Comic Neue Oblique', '', tm.join(__dirname, 'fixtures-font style'), function(err, buffer) {
        t.ifError(err);
        t.ok(buffer.length > 1200 && buffer.length < 2000, ' valid font size');
        t.end();
    });
});

test('tm oauth', function(t) {
    var oauth = tm.db.get('oauth');

    tm.db.set('oauth', null);
    t.throws(function() { tm.oauth(); }, /No active OAuth account/, 'throws without oauth info');

    tm.db.set('oauth', { account:'test' });
    t.deepEqual(tm.oauth(), { account:'test', isMapboxAPI:true }, 'gets oauth info');

    tm.db.set('oauth', oauth);

    t.end();
});

test('tm mapid', function(t) {
    var oauth = tm.db.get('oauth');

    tm.db.set('oauth', null);
    t.throws(function() { tm.mapid(); }, /No active OAuth account/, 'throws without oauth info');

    tm.db.set('oauth', { account:'test' });
    t.ok(/test\.[0-9a-f]{8}/.test(tm.mapid()), 'generates mapid');

    tm.db.set('oauth', oauth);

    t.end();
});

test('tm parse', function(t) {
    t.equal(tm.parse('tmstyle:///path/with/encoded%20spaces').dirname, '/path/with/encoded spaces');
    t.equal(tm.parse('tmstyle:///path/with/free spaces').dirname, '/path/with/free spaces');
    t.equal(tm.parse('tmstyle:///path/with/nospaces').dirname, '/path/with/nospaces');

    // handles url.parsed objects in the same way as strings
    t.equal(tm.parse(url.parse('tmstyle:///path/with/encoded%20spaces')).dirname, '/path/with/encoded spaces');
    t.equal(tm.parse(url.parse('tmstyle:///path/with/free spaces')).dirname, '/path/with/free spaces');
    t.equal(tm.parse(url.parse('tmstyle:///path/with/nospaces')).dirname, '/path/with/nospaces');

    // handles drivenames
    t.equal(tm.parse('tmstyle://c:/path/with/free spaces').dirname, 'c:/path/with/free spaces');
    t.equal(tm.parse(url.parse('tmstyle://C:/path/with/free spaces')).dirname, 'c:/path/with/free spaces');
    t.end();
});

test('tm join', function(t) {
    // Simulate windows if we're not.
    var sep = path.sep;
    path.sep = '\\';
    t.equal(tm.join('/home/villeda', 'somewhere'), '/home/villeda/somewhere');
    t.equal(tm.join('c:\\home\\villeda', 'somewhere'), 'c:/home/villeda/somewhere');
    t.equal(tm.join('c:\\home\\villeda'), 'c:/home/villeda');
    path.sep = sep;
    t.end();
});

test('tm absolute', function(t) {
    t.equal(tm.absolute('/absolute/path'), true);
    t.equal(tm.absolute('relative/path'), false);
    t.equal(tm.absolute('../relative/path'), false);
    t.equal(tm.absolute('c:/windows/path'), true);
    t.equal(tm.absolute('d:\\windows\\path'), true);
    t.equal(tm.absolute('Z:\\windows\\path'), true);
    t.equal(tm.absolute('windows\\path'), false);
    t.end();
});

test('tm fontfamilies', function(t) {
    var families = tm.fontfamilies();
    var expectedPath = path.join(__dirname, 'expected', 'fontfamilies.json');
    if (UPDATE) fs.writeFileSync(expectedPath, JSON.stringify(families, null, 2));
    t.deepEqual(families, JSON.parse(fs.readFileSync(expectedPath)));
    t.end();
});

test('tm copydir invalid from', function(t) {
    var dest = tm.join(tmppath, 'copydir-invalid-from');
    tm.copydir(tm.join(__dirname, 'doesnotexist'), dest, null, function(err) {
        t.equal(err.code, 'ENOENT', 'ENOENT');
        t.equal(fs.existsSync(dest), false, 'dest does not exist');
        t.end();
    });
});

test('tm copydir copies', function(t) {
    var dest = tm.join(tmppath, 'copydir');
    tm.copydir(tm.join(__dirname, 'fixtures-local source'), dest, null, function(err) {
        t.ifError(err);
        t.equal(fs.existsSync(dest), true, 'dest exists');
        t.equal(fs.existsSync(tm.join(dest, '10m_lakes_historic.shx')), true, 'copied files');
        t.end();
    });
});

test('tm copydir filter', function(t) {
    var dest = tm.join(tmppath, 'copydir-filtered');
    tm.copydir(tm.join(__dirname, 'fixtures-local source'), dest, [ /\.shx$/, 'data.yml' ], function(err) {
        t.ifError(err);
        t.equal(fs.existsSync(dest), true, 'dest exists');
        t.equal(fs.existsSync(tm.join(dest, '10m_lakes_historic.shx')), false, 'excludes by regexp');
        t.equal(fs.existsSync(tm.join(dest, 'data.yml')), false, 'excludes by string');
        t.equal(fs.existsSync(tm.join(dest, '10m_lakes_historic.shp')), true, 'includes shp');
        t.end();
    });
});

test('tm applog noop', function(t) {
    applog(false, 1, function(err) {
        t.ifError(err, 'noop on no filepath');
        t.end();
    });
});

test('tm applog err: not a file', function(t) {
    applog(tmppath, 1, function(err) {
        t.ok(/is not a file$/.test(err.toString()), 'error when filepath is not a file');
        t.end();
    });
});

test('tm applog', function(t) {
    var filepath = tm.join(tmppath + '/app.log');
    t.ok(!fs.existsSync(filepath), 'app.log does not exist');
    applog(filepath, 10, function(err) {
        t.ifError(err);
        process.stdout.write('      stdout\n');
        process.stderr.write('      stderr\n');
        setTimeout(function() {
            t.ok(fs.existsSync(filepath), 'creates app.log');
            t.equal(fs.readFileSync(filepath,'utf8'), '      stdout\n      stderr\n', 'writes stdout/stderr to app.log');
            rotates();
        }, 100);
    });

    function rotates() {
        applog(filepath, 10, function(err) {
            t.ifError(err);
            t.ok(fs.existsSync(filepath + '.0.gz'), 'rotates app log to app.log.0.gz');
            process.stdout.write('      stdout\n');
            process.stderr.write('      stderr\n');
            setTimeout(function() {
                t.equal(fs.readFileSync(filepath,'utf8'), '      stdout\n      stderr\n', 'writes stdout/stderr to app.log');
                t.end();
            }, 100);
        });
    }
});

test('tm api config MapboxAPITile', function(t) {
    var MapboxAPITile = tm.db.get('MapboxAPITile');

    tm.db.set('MapboxAPITile', null);
    t.equals(tm.apiConfig('MapboxAPITile'), 'https://a.tiles.mapbox.com');

    tm.db.set('MapboxAPITile', 'http://localhost:2999');
    t.deepEqual(tm.apiConfig('MapboxAPITile'), 'http://localhost:2999', 'gets MapboxAPITile info');

    tm.db.set('MapboxAPITile', MapboxAPITile);

    var origEnv = process.env.MapboxAPITile;
    process.env.MapboxAPITile = 'http://example-tile.com';
    t.deepEqual(tm.apiConfig('MapboxAPITile'), 'http://example-tile.com', 'gets MapboxAPITile from env');
    process.env.MapboxAPITile = origEnv;

    t.end();
});

test('tm api config MapboxAPIAuth', function(t) {
    var MapboxAPIAuth = tm.db.get('MapboxAPIAuth');

    tm.db.set('MapboxAPIAuth', null);
    t.equals(tm.apiConfig('MapboxAPIAuth'), 'https://api.mapbox.com');

    tm.db.set('MapboxAPIAuth', 'http://localhost:2999');
    t.deepEqual(tm.apiConfig('MapboxAPIAuth'), 'http://localhost:2999', 'gets MapboxAPIAuth info');

    tm.db.set('MapboxAPIAuth', MapboxAPIAuth);

    var origEnv = process.env.MapboxAPIAuth;
    process.env.MapboxAPIAuth = 'http://example-auth.com';
    t.deepEqual(tm.apiConfig('MapboxAPIAuth'), 'http://example-auth.com', 'gets MapboxAPIAuth from env');
    process.env.MapboxAPIAuth = origEnv;

    t.end();
});
