var tape = require('tape');
var exec = require('child_process').exec;

var count_module = function (name, callback) {
    var cmd = 'npm ls ' + name;
    exec(cmd,
        function (error, stdout, stderr) {
            var pattern = new RegExp(name + '@', 'g');
            var match = stdout.match(pattern);
            if (!match) {
                return callback(null, 0);
            }
            return callback(null, match.length);
        });
};

[
    'mapnik',
    'sqlite3',
    'gdal',
    'srs',
    'tilelive',
    'mbtiles',
    'mapnik-reference',
    'carto',
].forEach(function(mod) {
    tape.test('there should only be one ' + mod + ' module, otherwise you are asking for pwnage', function (t) {
        count_module(mod, function (err, count) {
            if (err) throw err;
            t.notEqual(count, 0);
            t.equal(count, 1);
            t.end();
        });
    });
});
