var fs = require('fs');
var path = require('path');
var assert = require('assert');
var project = require('../lib/project');
var defpath = path.dirname(require.resolve('tm2-default-style'));

describe('project', function() {
    var tmpPerm = '/tmp/tm2-perm-' + (+new Date);
    var data = {
        name:'tmp-1234',
        sources:['mbstreets'],
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
    it('loads default project from disk', function(done) {
        project({id:defpath}, function(err, proj) {
            assert.ifError(err);
            assert.ok('style.mss' in proj.data.styles, 'project load expands stylesheets');
            assert.equal(proj.data.background, 'rgba(255,255,255,1.00)', 'project load determines map BG color');
            done();
        });
    });
    it('saves project in memory', function(done) {
        project({id:'tmp-1234', data:data}, function(err, source) {
            assert.ifError(err);
            assert.ok(source);
            done();
        })
    });
    it('saves project to disk', function(done) {
        project({id:tmpPerm, data:data, perm:true}, function(err, source) {
            assert.ifError(err);
            assert.ok(source);
            assert.ok(/maxzoom: 22/.test(fs.readFileSync(tmpPerm + '/project.yml', 'utf8')), 'saves project.yml');
            assert.equal(data.styles['a.mss'], fs.readFileSync(tmpPerm + '/a.mss', 'utf8'), 'saves a.mss');
            assert.equal(data.styles['b.mss'], fs.readFileSync(tmpPerm + '/b.mss', 'utf8'), 'saves b.mss');
            assert.ok(/<Map srs/.test(fs.readFileSync(tmpPerm + '/project.xml', 'utf8')), 'saves project.xml');
            done();
        })
    });
    it ('packages project to tm2z', function(done) {
        project.toPackage({id:tmpPerm, filepath:tmpPerm + '.tm2z'}, function(err) {
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

describe('project.info', function() {
    it('fails on bad path', function(done) {
        project.info('/path/does/not/exist', function(err, info) {
            assert.ok(err);
            assert.equal('ENOENT', err.code);
            done();
        });
    });
    it('reads project YML', function(done) {
        project.info(defpath, function(err, info) {
            assert.ifError(err);
            assert.equal(info.minzoom, 0);
            assert.equal(info.maxzoom, 22);
            assert.equal(info.sources.length, 1);
            assert.deepEqual(info.styles, ['style.mss']);
            assert.equal(info._id, defpath, 'project.info adds _id key');
            done();
        });
    });
});

describe('project.toXML', function() {
    it('fails on invalid source', function(done) {
        project.toXML({
            _id:'tmp-1234',
            sources:['foobar']
        }, function(err, xml) {
            assert.ok(err);
            assert.equal('ENOENT', err.code);
            done();
        });
    });
    it('compiles', function(done) {
        project.toXML({
            _id:'tmp-1234',
            sources:['mbstreets'],
            styles:{'style.mss': '#water { polygon-fill:#fff }'}
        }, function(err, xml) {
            assert.ifError(err);
            assert.ok(/<Map srs/.test(xml), 'looks like Mapnik XML');
            assert.ok(/<Layer name="water"/.test(xml), 'includes layer');
            assert.ok(/group-by="layer"/.test(xml), 'includes layer properties');
            assert.ok(/<PolygonSymbolizer fill="#ffffff"/.test(xml), 'includes rule');
            assert.ok(!/<Parameter/.test(xml), 'no data params => no xml params');
            done();
        });
    });
    it('compiles data params', function(done) {
        project.toXML({
            _id:'tmp-1234',
            sources:['mbstreets'],
            name:'test',
            description:'test project',
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
            assert.ok(!/<Parameter name="custom/.test(xml));
            done();
        });
    });
});
