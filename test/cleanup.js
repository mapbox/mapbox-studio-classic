var rimraf = require('rimraf');
var tm = require('../lib/tm');

var tmpdir = tm.join(require('os').tmpdir(), 'mapbox-studio');
console.log('deleting temporary files:\n' + tmpdir);
rimraf(tmpdir, function(err) {
    if (err) throw err;
    console.log('temporary files deleted');
    process.exit(0);
});
