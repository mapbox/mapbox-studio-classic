var _ = require('underscore');
var carto = require('carto');
var fs = require('fs');
var path = require('path');
var url = require('url');
var mkdirp = require('mkdirp');
var sm = new (require('sphericalmercator'));
var yaml = require('js-yaml');
var tm = require('./tm');
var Bridge = require('tilelive-bridge');
var TileJSON = require('tilejson');

// Override _prepareURL to add in mod16 prefix token support.
TileJSON.prototype._prepareURL = function(url, z, x, y) {
    return url
        .replace(/\{prefix\}/g, (x%16).toString(16) + (y%16).toString(16))
        .replace(/\{z\}/g, z)
        .replace(/\{x\}/g, x)
        .replace(/\{y\}/g, (this.data.scheme === 'tms') ? (1 << z) - 1 - y : y);
};
var CachingTileJSON = require('./cache')(TileJSON, tm.config().cache);
var CachingBridge = require('./cache')(Bridge, tm.config().cache);

var srs900913 = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over';
var defaults = {
    name:'',
    description:'',
    attribution:'',
    mtime:+new Date,
    bounds:[-180,-85.0511,180,85.0511],
    minzoom:0,
    maxzoom:6,
    Layer:[],
    _prefs: {
        saveCenter: true,
        center:[0,0,3]
    }
};
var deflayer = {
    Datasource: {},
    properties: {
        minzoom:0,
        maxzoom:22,
        'buffer-size':0
    }
};

var cache = {};

var source = function(options, callback) {
    // Migrate legacy mbstreets references.
    if (options.id === 'mbstreets') options.id = 'mapbox://mapbox.mapbox-streets-v2';

    var id = options.base ? source.resolve(options.base, options.id) : options.id;
    var data = options.data;
    var perm = options.perm;

    if (!data && cache[id]) return callback(null, cache[id]);

    // Load for reads/writes.
    var load = function(data, xml) {
        var done = function(err, p) {
            if (err) return callback(err);
            // Use original id rather than resolved to preserve aliases,
            // relative paths.
            data.id = options.id;
            data._id = id;
            cache[id] = cache[id] || p;
            cache[id].data = data;
            return callback(null, cache[id]);
        };
        if (xml) {
            var opts = {};
            opts.xml = xml;
            opts.base = !tm.tmpid(id) ? id : opts.base;
            return cache[id] ? cache[id].update(opts, done) : new CachingBridge(opts, done);
        } else {
            return cache[id] ? done(null, cache[id]) : new CachingTileJSON({data:data}, done);
        }
    };

    // Reading / no-op write for remote sources.
    var uri = url.parse(id);
    if (!data || uri.protocol !== undefined) return source.info(id, function(err, data) {
        if (err) return callback(err);
        return source.toXML(data, function(err, xml) {
            if (err) return callback(err);
            return load(data, xml);
        });
    });

    // Writing.
    data = _(data).defaults(defaults);
    source.toXML(data, function(err, xml) {
        if (err) return callback(err);
        data.mtime = +new Date;
        if (!perm) return load(data, xml);

        var files = [];
        // @TODO get multiline strings into js-yaml : (
        files.push({
            basename: 'data.yml',
            data: yaml.dump(_(data).reduce(function(memo,v,k) {
                if (!(k in defaults)) return memo;
                memo[k] = v;
                return memo;
            }, {}), null, 2)
        });
        files.push({ basename: 'data.xml', data: xml });

        tm.writefiles(id, files, function(err) {
            if (err) return callback(err);
            load(data, xml);
        });
    });
};

// @TODO
source.library = _(fs.readdirSync(__dirname + '/../sources')).reduce(function(memo, dir) {
    if (dir.charAt(0) === '.') return memo;
    memo[dir] = yaml.load(fs.readFileSync(__dirname + '/../sources/' + dir + '/data.yml', 'utf8'));
    memo[dir].id = dir;
    return memo;
}, {});

source.toXML = function(data, callback) {
    if (data.tiles) return callback();

    // Include params to be written to XML.
    var opts = [
        'name',
        'description',
        'attribution',
        'bounds',
        'center',
        'minzoom',
        'maxzoom'
    ].reduce(function(memo, key) {
        if (key in data) memo[key] = data[key];
        return memo;
    }, {});
    opts.srs = srs900913;
    opts.Layer = data.Layer.map(function(l) {
        l.srs = l.srs || srs900913;
        l.name = l.id;
        return l;
    });

    new carto.Renderer().render(opts, callback);
};

// Light read of project info.
source.info = function(id, callback) {
    var uri = url.parse(id);
    switch (uri.protocol) {
    case 'mapbox:':
        if (source.library[uri.host]) {
            callback(null, source.library[uri.host]);
        } else {
            var err = new Error('Not found');
            err.code = 'ENOENT';
            callback(err);
        }
        break;
    case null:
    case false:
    case undefined:
        fs.readFile(path.join(id,'data.yml'), 'utf8', function(err, data) {
            if (err) return callback(err);
            try { data = yaml.load(data); }
            catch(err) { return callback(err); }
            data._id = id;
            data = _(data).defaults(defaults);
            // Initialize defaults for layers in a deep way.
            data.Layer = data.Layer.map(function(l) {
                l = _(l).defaults(deflayer)
                l.properties = _(l.properties).defaults(deflayer.properties);
                return l;
            });
            return callback(null, data);
        });
        break;
    default:
        callback(new Error('Unsupported source protocol'));
        break;
    }
};

// Resolve a source id reference to an absolute path.
source.resolve = function(basepath, id) {
    var uri = url.parse(id);
    switch (uri.protocol) {
    case null:
    case false:
    case undefined:
        // Absolute path.
        if (id[0] === '/') return id;

        // Relative path.
        return path.resolve(path.join(basepath, id));
    default:
        return id;
    }
};

// Invalidate a source from the cache.
source.invalidate = function(id, callback) {
    if (!cache[id] || !cache[id]._mbtiles) {
        delete cache[id];
        return callback();
    }
    cache[id]._mbtiles._db.exec('DELETE FROM map; DELETE FROM images;', function(err) {
        if (err) return callback(err);
        delete cache[id];
        return callback();
    });
};

module.exports = source;
