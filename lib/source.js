var _ = require('underscore');
var carto = require('carto');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var url = require('url');
var mkdirp = require('mkdirp');
var sm = new (require('sphericalmercator'));
var yaml = require('js-yaml');
var tm = require('./tm');
var Bridge = require('tilelive-bridge');
var TileJSON = require('tilejson');
var tilelive = require('tilelive');
var style;

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

var defaults = {
    name:'',
    description:'',
    attribution:'',
    mtime:+new Date,
    minzoom:0,
    maxzoom:6,
    center:[0,0,3],
    Layer:[],
    _prefs: {
        saveCenter: true,
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
    var id = options.id;
    var uri = url.parse(id);
    var data = options.data;
    var perm = options.perm;
    var remote = uri.protocol === 'mapbox:';

    if (uri.protocol !== 'tmsource:' && uri.protocol !== 'mapbox:')
        return callback(new Error('Invalid source protocol'));

    if (!data && cache[id]) return callback(null, cache[id]);

    // Load for reads/writes.
    var load = function(data, xml) {
        var done = function(err, p) {
            if (err) return callback(err);
            data.id = id;
            cache[id] = cache[id] || p;
            cache[id].data = data;

            style = style || require('./style');
            style.save({
                id: style.tmpid(id, true),
                styles: [tm.templates.xraystyles(data)],
                source: id,
                center: data.center
            }, function(err, source) {
                if (err) return callback(err);
                if (perm) style.thumbSave(style.tmpid(id, true), path.join(uri.pathname,'.thumb.png'));
                cache[id].style = source;
                cache[id].data._style = style.tmpid(id, true);
                return callback(null, cache[id]);
            });
        };
        if (xml) {
            var opts = {};
            opts.xml = xml;
            opts.base = !source.tmpid(id) && uri.pathname;
            return cache[id] ? cache[id].update(opts, done) : new CachingBridge(opts, done);
        } else {
            return cache[id] ? done(null, cache[id]) : new CachingTileJSON({data:data}, done);
        }
    };

    // Reading / no-op write for remote sources.
    if (!data || remote) return source.info(id, function(err, data) {
        if (err) return callback(err);
        return source.toXML(data, function(err, xml) {
            if (err) return callback(err);
            // "Soft-write" (_prefs, mtime) for remote sources.
            if (options.data && options.data._prefs) {
                data._prefs = options.data._prefs;
                data.mtime = +new Date;
            }
            return load(data, xml);
        });
    });

    // Writing.
    data = _(data).defaults(defaults);
    data._tmp = source.tmpid(id);
    source.toXML(data, function(err, xml) {
        if (err) return callback(err);
        data.mtime = +new Date;
        if (!perm) return load(data, xml);

        var files = [];
        files.push({
            basename: 'data.yml',
            data: yaml.dump(tm.sortkeys(_(data).reduce(function(memo,v,k) {
                if (!(k in defaults)) return memo;
                memo[k] = v;
                return memo;
            }, {})), null, 2)
        });
        files.push({ basename: 'data.xml', data: xml });

        tm.writefiles(uri.pathname, files, function(err) {
            if (err) return callback(err);
            load(data, xml);
        });
    });
};

// Generate or verify that an id is a temporary one.
source.tmpid = function(id, md5) {
    if (id && !md5) return /tmsource:\/\/\/tmp-[0-9a-f]{8}/.test(id);

    if (id && md5) {
        return 'tmsource:///tmp-' + crypto.createHash('md5').update(id).digest('hex').substr(0,8);
    } else {
        id = 'tmsource:///tmp-';
        var base16 = '0123456789abcdef';
        for (var i = 0; i < 8; i++) id += base16[Math.random() * 16 | 0];
        return id;
    }
};

// @TODO
source.library = _(fs.readdirSync(__dirname + '/../sources')).reduce(function(memo, dir) {
    if (dir.charAt(0) === '.') return memo;
    var id = 'mapbox:///' + dir;
    memo[id] = yaml.load(fs.readFileSync(__dirname + '/../sources/' + dir + '/data.yml', 'utf8'));
    memo[id].id = id;
    return memo;
}, {});

source.toXML = function(data, callback) {
    if (data.tiles) return callback();

    // Include params to be written to XML.
    var opts = [
        'name',
        'description',
        'attribution',
        'center',
        'minzoom',
        'maxzoom'
    ].reduce(function(memo, key) {
        if (key in data) memo[key] = data[key];
        return memo;
    }, {});
    opts.srs = tm.srs['900913'];
    opts.Layer = data.Layer.map(function(l) {
        l.srs = l.srs || tm.srs['900913'];
        l.name = l.id;
        return l;
    });

    new carto.Renderer().render(tm.sortkeys(opts), callback);
};

// Light read of style info.
source.info = function(id, callback) {
    var uri = url.parse(id);

    if (uri.protocol !== 'tmsource:' && uri.protocol !== 'mapbox:')
        return callback(new Error('Invalid source protocol'));

    var load = function(data, callback) {
        data.id = id;
        data = _(data).defaults(defaults);
        // Initialize deep defaults for _prefs, layers.
        data._prefs = _(data._prefs).defaults(defaults._prefs);
        data.Layer = data.Layer.map(function(l) {
            l = _(l).defaults(deflayer)
            l.properties = _(l.properties).defaults(deflayer.properties);
            return l;
        });
        return callback(null, data);
    };
    switch (uri.protocol) {
    case 'mapbox:':
        if (source.library[id]) {
            load(source.library[id], callback);
        } else {
            var err = new Error('Not found');
            err.code = 'ENOENT';
            callback(err);
        }
        break;
    case 'tmsource:':
        fs.readFile(path.join(uri.pathname,'data.yml'), 'utf8', function(err, data) {
            if (err) return callback(err);
            try { data = yaml.load(data); }
            catch(err) { return callback(err); }
            return load(data, callback);
        });
        break;
    default:
        callback(new Error('Unsupported source protocol'));
        break;
    }
};

// Invalidate a source from the cache.
source.invalidate = function(id, callback) {
    if (!cache[id] || !cache[id]._mbtiles) return callback();
    cache[id]._mbtiles._db.exec('PRAGMA synchronous=OFF; DELETE FROM map; DELETE FROM images;', callback);
};

tilelive.protocols['mapbox:'] = Source;
tilelive.protocols['tmsource:'] = Source;
function Source(uri, callback) {
    if ('string' !== typeof uri) uri = url.format(uri);
    source({id:uri}, callback);
};

module.exports = source;
