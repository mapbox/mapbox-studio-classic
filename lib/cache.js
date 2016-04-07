var util = require('util');
var path = require('path');
var crypto = require('crypto');
var MBTiles = require('mbtiles');
var cache = {};

function verbose(extra, err) {
    err.message = extra + ': ' + err.message;
    return err;
}

// Wrap the passed Source type to create a caching source.
module.exports = function(Source, cachedir) {
    function CachingSource(uri, callback) {
        return Source.call(this, uri, function(err, source) {
            if (err) return callback(err);
            if (!source._xml && !source.data) return callback(new Error('No hash data for caching source'));
            var hash = crypto.createHash('md5')
                .update(source._xml || source.data.id)
                .digest('hex')
                .substr(0,16);
            var cachepath = path.join(cachedir, hash + '.mbtiles');

            if (cache[cachepath]) {
                source._mbtiles = cache[cachepath];
                cache[cachepath]._cacheStats.hit++;
                return callback(null, source);
            }

            // Pass filepath to node-mbtiles in uri object to avoid
            // url.parse() upstream mishandling windows paths.
            new MBTiles({
                pathname: cachepath,
                query: { batch: 1 }
            }, function(err, mbtiles) {
                if (err) return callback(verbose('MBTiles ' + cachepath, err));
                source._mbtiles = mbtiles;
                source._mbtiles.startWriting(function(err) {
                    if (err) return callback(verbose('startWriting ' + cachepath, err));
                    mbtiles._cacheStats = { hit:0, miss:1 };
                    cache[cachepath] = mbtiles;
                    return callback(null, source);
                });
            });
        });
    };
    util.inherits(CachingSource, Source);
    CachingSource.prototype.getTile = function(z,x,y,callback) {
        if (!this._mbtiles) return callback(new Error('Tilesource not loaded'));
        if (this._nocache) return Source.prototype.getTile.call(this,z,x,y,callback);

        var source = this;
        this._mbtiles.getTile(z,x,y,function(err, data, headers) {
            if (!err) {
                if (data) data._cache = 'hit';
                return callback(err, data, headers);
            }
            try {
                Source.prototype.getTile.call(source,z,x,y,function(err, data, headers) {
                    if (data) data._cache = 'miss';
                    callback(err, data, headers);
                    if (!err && data) source._mbtiles.putTile(z,x,y,data,function(err){
                        if (err) console.error(verbose('putTile', err));
                    });
                });
            } catch (err) {
                console.error(verbose('getTile', err));
                return callback(err);
            }
        });
    };
    return CachingSource;
};
