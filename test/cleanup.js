var rimraf = require('rimraf');
var tm = require('../lib/tm');

rimraf(tm.join(require('os').tmpdir(), 'mapbox-studio'), function(err) {
    if (err) throw err;
    process.exit(0);
});
