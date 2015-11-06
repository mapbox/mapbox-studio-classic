var fs = require('fs');
var path = require('path');
var through = require('through');
var rotate = require('log-rotate');

// Set up app logging to a file with rotation.
module.exports = function(filepath, maxsize, callback) {
    if (!filepath) return callback();

    fs.stat(filepath, function(err, stat) {
        if (err && err.code !== 'ENOENT') return callback(err);
        if (stat && !stat.isFile()) return callback(new Error(filepath + ' is not a file'));
        if (!err && stat && stat.size > maxsize) {
            rotate(filepath, { compress: true }, function(err) {
                if (err) return callback(err);
                setup(0);
            });
        } else {
            setup(stat && stat.size || 0);
        }
    });


    function setup(offset) {
        var dir = path.dirname(filepath);
        if(!fs.existsSync(dir)) {
            try{
                fs.mkdirSync(dir);
            }
            catch(err) {
                var msg = 'Problem writing to logfile at ' + filepath;
                //console.warn(msg);
                return callback(msg);
            }
        }
        var logstream = fs.createWriteStream(filepath, {
            flags: offset ? 'r+' : 'w',
            start: offset
        });
        logstream.on('error', function (err) {
            var msg = 'Problem writing to logfile at ' + filepath;
            //console.warn(msg);
            return callback(msg);
        })
        var pipeout = through();
        var pipeerr = through();
        pipeout.pipe(logstream);
        pipeout.pipe(process.stdout);
        pipeerr.pipe(logstream);
        pipeerr.pipe(process.stderr);
        process.__defineGetter__('stdout', function() { return pipeout; });
        process.__defineGetter__('stderr', function() { return pipeerr; });
        return callback();
    }
};
