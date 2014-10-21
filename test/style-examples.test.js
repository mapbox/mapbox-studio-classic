var test = require('tape');
var tm = require('../lib/tm');
var style = require('../lib/style');
var source = require('../lib/source');
var mockOauth = require('../lib/mapbox-mock')(require('express')());
var tmppath = tm.join(require('os').tmpdir(), 'Examples ШЖФ -' + (+new Date));
var server;

test('setup', function(t) {
    tm.config({
        log: false,
        db: tm.join(tmppath, 'app.db'),
        cache: tm.join(tmppath, 'cache'),
        fonts: tm.join(tmppath, 'fonts'),
        mapboxauth: 'http://localhost:3001'
    }, t.end);
});

test('setup: mockserver', function(t) {
    tm.db.set('oauth', {
        account: 'test',
        accesstoken: 'testaccesstoken'
    });
    tm._config.MapboxAuth = 'http://localhost:3001',
    tm._config.MapboxTile = 'http://localhost:3001/v4';
    server = mockOauth.listen(3001, t.end);
});

for (var key in style.examples) (function(key) {
    test(key, function(t) {
        style(style.examples[key], function(err, s) {
            t.ifError(err);
            t.ok(!s.data._prefs.mapid, 'no mapid set');
            t.end();
        });
    });
})(key);

test('cleanup', function(t) {
    server.close(function() { t.end(); });
});

