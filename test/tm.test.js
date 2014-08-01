var test = require('tape');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var tm = require('../lib/tm');
var dirty = require('dirty');
var tmppath = path.join(require('os').tmpdir(), 'tm2-lib-' + +new Date);
var stream = require('stream');
var progress = require('progress-stream');
var UPDATE = process.env.UPDATE;

test('setup: config', function(t) {
    tm.config({
        db: path.join(tmppath, 'app.db'),
        fonts: path.join(tmppath, 'fonts'),
        cache: path.join(tmppath, 'cache')
    }, t.end);
});

test('setup: db', function(t) {
    fs.writeFileSync(path.join(tmppath, 'noncompact.db'), fs.readFileSync(path.join(__dirname, 'fixtures-dirty', 'noncompact.db')));
    fs.writeFileSync(path.join(tmppath, 'schema-v1.db'), fs.readFileSync(path.join(__dirname, 'fixtures-dirty', 'schema-v1.db')));
    fs.writeFileSync(path.join(tmppath, 'schema-v2.db'), fs.readFileSync(path.join(__dirname, 'fixtures-dirty', 'schema-v2.db')));
    t.end();
});

test('tm migrate v1', function(t) {
    var dbpath = path.join(tmppath, 'schema-v1.db');
    var db = dirty(dbpath);
    db.once('load', function() {
        var docs = {};
        tm.dbmigrate(db);
        db.forEach(function(k,v) { docs[k] = v });
        t.deepEqual({
            version: 3,
            history: [
                'tmstyle:///no-protocol/path/style.tm2',
                'mapbox:///mapbox.mapbox-streets-v2'
            ]
        }, docs);
        t.end();
    });
});

test('tm migrate v2', function(t) {
    var dbpath = path.join(tmppath, 'schema-v2.db');
    var db = dirty(dbpath);
    db.once('load', function() {
        var docs = {};
        tm.dbmigrate(db);
        db.forEach(function(k,v) { docs[k] = v });
        t.deepEqual({
            version: 3,
            history: [
                'tmstyle:///no-protocol/path/style.tm2',
                'mapbox:///mapbox.mapbox-streets-v2'
            ]
        }, docs);
        t.end();
    });
});

test('tm compacts', function(t) {
    var dbpath = path.join(tmppath, 'noncompact.db');
    t.equal(276, fs.statSync(dbpath).size);
    tm.dbcompact(dbpath, function(err, db) {
        t.ifError(err);
        db.on('drain', function() {
            t.equal(23, fs.statSync(dbpath).size);
            t.end();
        });
    });
});

test('tm compacts nofile', function(t) {
    var dbpath = path.join(tmppath, 'doesnotexist.db');
    t.equal(false, fs.existsSync(dbpath));
    tm.dbcompact(dbpath, function(err, db) {
        t.ifError(err);
        db.set('test', 1);
        db.on('drain', function() {
            t.equal(23, fs.statSync(dbpath).size);
            t.end();
        });
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
    if (platform === 'linux' || platform === 'darwin') {
        fs.symlinkSync('broken',path.join(__dirname,'fixtures-localsource','broken-symlink'));
        t.ok(fs.existsSync(__dirname,'fixtures-localsource','broken-symlink'));
    }
    tm.dirfiles(__dirname + '/fixtures-localsource', function(err, files) {
        t.ifError(err);
        t.deepEqual([
            '10m-900913-bounding-box.dbf',
            '10m-900913-bounding-box.index',
            '10m-900913-bounding-box.prj',
            '10m-900913-bounding-box.shp',
            '10m-900913-bounding-box.shx',
            '10m_lakes_historic.dbf',
            '10m_lakes_historic.index',
            '10m_lakes_historic.prj',
            '10m_lakes_historic.shp',
            '10m_lakes_historic.shx',
            'data.yml',
            'project.yml'
        ], files.map(function(f) { return f.basename }));
        if (platform === 'linux' || platform === 'darwin') {
            fs.unlinkSync(path.join(__dirname,'fixtures-localsource','broken-symlink'));
        }
        t.end();
    });
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
    t.end();
});

test('tm font (invalid)', function(t) {
    tm.font('doesnotexist', '', function(err) {
        t.equal('Invalid font doesnotexist', err.message);
        t.end();
    });
});

test('tm font (valid)', function(t) {
    tm.font('Source Sans Pro Bold', '', function(err, buffer) {
        t.ifError(err);
        t.ok(buffer.length > 600 && buffer.length < 1000);
        setTimeout(function() {
            t.ok(fs.existsSync(path.join(tm.config().cache, 'font-bd95f62a.png')));
            t.end();
        }, 1000);
    });
});

test('tm font (cache hit)', function(t) {
    var start = +new Date;
    tm.font('Source Sans Pro Bold', '', function(err, buffer) {
        t.ifError(err);
        t.ok(buffer.length > 600 && buffer.length < 1000);
        t.ok((+new Date - start) < 50);
        t.end();
    });
});

test('tm oauth', function(t) {
    var oauth = tm.db.get('oauth');

    tm.db.set('oauth', null);
    t.throws(function() { tm.oauth(); }, /No active OAuth account/, 'throws without oauth info');

    tm.db.set('oauth', { account:'test' });
    t.deepEqual(tm.oauth(), { account:'test' }, 'gets oauth info');

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

test('cleanup', function(t) {
    try { fs.unlinkSync(path.join(tmppath, 'app.db')); } catch(err) {}
    try { fs.unlinkSync(path.join(tmppath, 'noncompact.db')); } catch(err) {}
    try { fs.unlinkSync(path.join(tmppath, 'schema-v1.db')); } catch(err) {} 
    try { fs.unlinkSync(path.join(tmppath, 'cache', 'font-dbad83a6.png')); } catch(err) {}
    try { fs.rmdirSync(path.join(tmppath, 'cache')); } catch(err) {}
    try { fs.rmdirSync(tmppath); } catch(err) {}
    t.end();
});

