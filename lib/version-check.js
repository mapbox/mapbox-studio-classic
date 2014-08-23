var http = require('http');

// check against public file to see if this is the current version of Mapbox Studio
module.exports = function (opts, callback) {
    var update = false;
    http.request({
        host: opts.host,
        port: opts.port || 80,
        path: opts.path,
        method: 'GET'
    }, function(response){
        var latest = '';
        response.on('data', function (chunk) {
            latest += chunk;
        });
        response.on('end', function () {
            var current = opts.pckge.version.replace(/^\s+|\s+$/g, '');
            latest = latest.replace(/^\s+|\s+$/g, '');
            if (latest !== current) {
                update = true;
            }
            return callback(update, current, latest);
        });
    })
    .on('error', function(err){
        return callback(false);
    })
    .end();
};