var https = require('https');

module.exports = function (opts, callback) {
    var update = false;
    https.request({
        host: opts.host,
        path: opts.path
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
    .on('error', function(){
        return callback(false);
    })
    .end();
};