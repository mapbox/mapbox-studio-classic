var fs = require('fs');
var path = require('path');
var assert = require('assert');
var tm = require('../lib/tm');
var dirty = require('dirty');

describe('tm', function() {

    var tmppath = path.join(require('os').tmpdir(), 'tm2-test-' + +new Date);
    before(function(done) {
        tm.config({
            db: path.join(tmppath, 'app.db'),
            cache: path.join(tmppath, 'cache')
        }, done);
    });
    before(function(done) {
        fs.writeFileSync(path.join(tmppath, 'noncompact.db'), fs.readFileSync(path.join(__dirname, 'fixtures-dirty', 'noncompact.db')));
        fs.writeFileSync(path.join(tmppath, 'schema-v1.db'), fs.readFileSync(path.join(__dirname, 'fixtures-dirty', 'schema-v1.db')));
        done();
    });
    after(function(done) {
        try { fs.unlinkSync(path.join(tmppath, 'app.db')); } catch(err) {}
        try { fs.unlinkSync(path.join(tmppath, 'noncompact.db')); } catch(err) {}
        try { fs.unlinkSync(path.join(tmppath, 'schema-v1.db')); } catch(err) {} 
        try { fs.unlinkSync(path.join(tmppath, 'cache', 'font-dbad83a6.png')); } catch(err) {}
        try { fs.rmdirSync(path.join(tmppath, 'cache')); } catch(err) {}
        try { fs.rmdirSync(tmppath); } catch(err) {}
        done();
    });

    it('migrates', function(done) {
        var dbpath = path.join(tmppath, 'schema-v1.db');
        var db = dirty(dbpath);
        db.once('load', function() {
            var docs = {};
            tm.dbmigrate(db);
            db.forEach(function(k,v) { docs[k] = v });
            assert.deepEqual({
                version: 2,
                history: {
                    style: [ 'tmstyle:///no-protocol/path/style.tm2' ],
                    source: [ 'mapbox:///mapbox.mapbox-streets-v2' ]
                }
            }, docs);
            done();
        });
    });

    it('compacts', function(done) {
        var dbpath = path.join(tmppath, 'noncompact.db');
        assert.equal(276, fs.statSync(dbpath).size);
        tm.dbcompact(dbpath, function(err, db) {
            assert.ifError(err);
            db.on('drain', function() {
                assert.equal(23, fs.statSync(dbpath).size);
                done();
            });
        });
    });

    it('compacts nofile', function(done) {
        var dbpath = path.join(tmppath, 'doesnotexist.db');
        assert.equal(false, fs.existsSync(dbpath));
        tm.dbcompact(dbpath, function(err, db) {
            assert.ifError(err);
            db.set('test', 1);
            db.on('drain', function() {
                assert.equal(23, fs.statSync(dbpath).size);
                done();
            });
        });
    });

    it('sortkeys', function() {
        assert.deepEqual(['id', 'bar', 'foo'], Object.keys(tm.sortkeys({
            foo: 'foo',
            bar: 'bar',
            id: 'id'
        })));
    });

    it('filterkeys', function() {
        assert.deepEqual({apples:true,bananas:true}, tm.filterkeys({
            apples: true,
            bananas: true,
            vegetables: true
        }, {apples:'', bananas:''}));
    });

    it('dirfiles', function(done) {
        var platform = require('os').platform();
        if (platform === 'linux' || platform === 'darwin') {
            fs.symlinkSync('broken',path.join(__dirname,'fixtures-localsource','broken-symlink'));
            assert.ok(fs.existsSync(__dirname,'fixtures-localsource','broken-symlink'));
        }
        tm.dirfiles(__dirname + '/fixtures-localsource', function(err, files) {
            assert.ifError(err);
            assert.deepEqual([
                '10m-900913-bounding-box.dbf',
                '10m-900913-bounding-box.index',
                '10m-900913-bounding-box.prj',
                '10m-900913-bounding-box.shp',
                '10m-900913-bounding-box.shx',
                'data.yml',
                'project.yml'
            ], files.map(function(f) { return f.basename }));
            if (platform === 'linux' || platform === 'darwin') {
                fs.unlinkSync(path.join(__dirname,'fixtures-localsource','broken-symlink'));
            }
            done();
        });
    });

    // @TODO tm.writefiles

    it('history', function() {
        assert.deepEqual({style:[], source:[
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history(),
            'Inits with defaults');
        assert.deepEqual({style:[], source:[
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history('insufficient args'),
            'Does not attempt set without enough args');
        assert.throws(function() { tm.history('badtype', 'foo') }, /requires valid type/,
            'Throws error on bad type');
        assert.deepEqual({style:['foo'], source:[
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history('style', 'foo'),
            'Sets style');
        assert.deepEqual({style:['foo'], source:[
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history(),
            'Confirm set');
        assert.deepEqual({style:['foo'], source:[
            'bar',
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history('source', 'bar'),
            'Sets source');
        assert.deepEqual({style:['foo'], source:[
            'bar',
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history(),
            'Confirm set');
        assert.deepEqual({style:['foo'], source:[
            'bar',
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history('source', 'bar'),
            'Ignores duplicates');
        assert.deepEqual({style:['foo'], source:[
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history('source', 'bar', true),
            'Invalidates source');
        assert.deepEqual({style:['foo'], source:[
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history(),
            'Confirm invalidation');
        assert.deepEqual({style:['foo'], source:[
            'mapbox:///mapbox.mapbox-streets-v4'
        ]}, tm.history('source', 'mapbox:///mapbox.mapbox-streets-v4', true),
            'Cannot invalidate default source');
    });

    it('font (invalid)', function(done) {
        tm.font('doesnotexist', function(err) {
            assert.equal('Invalid font doesnotexist', err.message);
            done();
        });
    });

    it('font (valid)', function(done) {
        tm.font('Source Sans Pro Bold', function(err, buffer) {
            assert.ifError(err);
            assert.ok(buffer.length > 600 && buffer.length < 1000);
            setTimeout(function() {
                assert.ok(fs.existsSync(path.join(tm.config().cache, 'font-dbad83a6.png')));
                done();
            }, 1000);
        });
    });

    it('font (cache hit)', function(done) {
        var start = +new Date;
        tm.font('Source Sans Pro Bold', function(err, buffer) {
            assert.ifError(err);
            assert.ok(buffer.length > 600 && buffer.length < 1000);
            assert.ok((+new Date - start) < 50);
            done();
        });
    });

    it('tmpid', function() {
        ['tmsource:', 'tmstyle:'].forEach(function(protocol) {
            assert.ok(tm.tmpid(protocol, tm.tmpid(protocol)));
            assert.ok(tm.tmpid(protocol) !== tm.tmpid(protocol));
            assert.ok(tm.tmpid(protocol, 'hello', true) === tm.tmpid(protocol, 'hello', true));
            assert.ok(tm.tmpid(protocol, tm.tmpid(protocol, 'hello world', true)));
            assert.ok(!tm.tmpid(protocol, protocol + '///real/ish/path'));
            assert.ok(!tm.tmpid(protocol, protocol + '///tmp-1234'));
            assert.ok(!tm.tmpid(protocol, 'mapbox:///tmp-1234'));
            assert.ok(tm.tmpid(protocol, protocol + '///tmp-12345678'));
        });
    });

    it('parse', function() {
        assert.equal(tm.parse('tmstyle:///path/with/encoded%20spaces').dirname, '/path/with/encoded spaces');
        assert.equal(tm.parse('tmstyle:///path/with/free spaces').dirname, '/path/with/free spaces');
        assert.equal(tm.parse('tmstyle:///path/with/nospaces').dirname, '/path/with/nospaces');
    });

    it('absolute', function() {
        assert.equal(tm.absolute('/absolute/path'), true);
        assert.equal(tm.absolute('relative/path'), false);
        assert.equal(tm.absolute('../relative/path'), false);
        assert.equal(tm.absolute('c:/windows/path'), true);
        assert.equal(tm.absolute('d:\\windows\\path'), true);
        assert.equal(tm.absolute('Z:\\windows\\path'), true);
        assert.equal(tm.absolute('windows\\path'), false);
    });
});
