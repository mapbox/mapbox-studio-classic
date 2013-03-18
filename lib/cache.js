var util = require('util');
var path = require('path');
var crypto = require('crypto');
var MBTiles = require('mbtiles');

// Wrap the passed Source type to create a caching source.
module.exports = function(Source, cache) {
    function CachingSource(uri, callback) {
        return Source.call(this, uri, function(err, source) {
            if (err) return callback(err);
            var hash = crypto.createHash('md5')
                .update(JSON.stringify(source.data||source._xml))
                .digest('hex')
                .substr(0,16);
            var cachepath = path.join(cache, hash + '.mbtiles?batch=16');
            new MBTiles(cachepath, function(err, mbtiles) {
                if (err) return callback(err);
                source._mbtiles = mbtiles;
                source._mbtiles.startWriting(function(err) {
                    if (err) return callback(err);
                    return callback(null, source);
                });
            });
        });
    };
    util.inherits(CachingSource, Source);
    CachingSource.prototype.getTile = function(z,x,y,callback) {
        if (!this._mbtiles) return callback(new Error('Tilesource not loaded'));
        var source = this;
        this._mbtiles.getTile(z,x,y,function(err, data, headers) {
            if (!err) return callback(err, data, headers);
            Source.prototype.getTile.call(source,z,x,y,function(err, data, headers) {
                callback(err, data, headers);
                if (!err && data) source._mbtiles.putTile(z,x,y,data,function(){});
            });
        });
    };
    return CachingSource;
};
