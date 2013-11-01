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
var CachingTileJSON = require('./cache')(TileJSON, tm.config().cache);
var CachingBridge = require('./cache')(Bridge, tm.config().cache);
var mapnik = require('mapnik');
var mapnikref = require('mapnik-reference').version.latest;

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
        disabled: [],
        inspector: false
    }
};
var deflayer = {
    id:'',
    srs:'',
    description:'',
    fields: {},
    Datasource: {},
    properties: {
        minzoom:0,
        maxzoom:22,
        'buffer-size':0
    }
};

var cache = {};


module.exports = source;
tilelive.protocols['mapbox:'] = source;
tilelive.protocols['tmsource:'] = source;
tilelive.protocols['http:'] = source;
tilelive.protocols['https:'] = source;

source.defaults = defaults;
source.deflayer = deflayer;

var protocolIsValid = function (protocol) {
    return _(['tmsource:', 'mapbox:', 'http:', 'https:']).contains(protocol);
};

function source(arg, callback) {
    if ('string' !== typeof arg) {
        var id = url.format(arg);
        var uri = arg;
    } else {
        var id = arg;
        var uri = url.parse(arg);
    }

    if (!protocolIsValid(uri.protocol))
        return callback(new Error('Invalid source protocol'));

    if (cache[id]) return callback(null, cache[id]);

    source.info(id, function(err, data) {
        if (err) return callback(err);
        data = source.normalize(data);
        source.toXML(data, function(err, xml) {
            if (err) return callback(err);
            source.refresh(data, xml, callback);
        });
    });
};

// Load or refresh the relevant source using specified data + xml.
source.refresh = function(data, xml, callback) {
    var id = data.id;
    var uri = url.parse(data.id);
    var done = function(err, p) {
        if (err) return callback(err);
        cache[id] = cache[id] || p;
        cache[id].data = data;

        var interactivity_layer;
        var template = '';
        if (data.vector_layers.length && data._prefs.inspector) {
            var inspector = _(data.vector_layers).find(function(l) {
                return l.id === data._prefs.inspector;
            });
            if (inspector && inspector.fields) {
                interactivity_layer = inspector.id;
                template = tm.templates.xraytemplate(Object.keys(inspector.fields));
            }
        }
        style = style || require('./style');
        style.save({
            id: style.tmpid(id, true),
            styles: [tm.templates.xraystyles(data)],
            source: id,
            center: data.center,
            interactivity_layer: interactivity_layer,
            template: template
        }, function(err, source) {
            if (err) return callback(err);
            cache[id].style = source;
            cache[id].data._style = style.tmpid(id, true);
            cache[id].data._template = template;
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

// Writing.
source.save = function(data, callback) {
    var id = data.id;
    var uri = url.parse(data.id);
    var perm = !source.tmpid(id);
    var remote = ['mapbox:', 'http:', 'https:'].indexOf(uri.protocol) >= 0;

    // "Soft" write for remote sources.
    if (remote) return source.info(id, function(err, info) {
        if (err) return callback(err);
        info.mtime = +new Date;
        info._prefs = data._prefs || info._prefs;
        info = source.normalize(info);
        source.refresh(info, null, callback);
    });

    data = _(data).defaults(defaults);
    data._tmp = source.tmpid(id);
    data.mtime = +new Date;
    data = source.normalize(data);

    source.toXML(data, function(err, xml) {
        if (err) return callback(err);
        if (!perm) return source.refresh(data, xml, callback);

        var files = [];
        var filtered = tm.filterkeys(data, defaults);
        filtered.Layer = filtered.Layer.map(function(l) { return tm.filterkeys(l, deflayer) });
        files.push({
            basename: 'data.yml',
            data: yaml.dump(tm.sortkeys(filtered), null, 2)
        });
        files.push({ basename: 'data.xml', data: xml });

        tm.writefiles(uri.pathname, files, function(err) {
            if (err) return callback(err);
            source.refresh(data, xml, function(err, p) {
                if (err) return callback(err);
                style.thumbSave(style.tmpid(id,true), path.join(uri.pathname,'.thumb.png'));
                callback(null, p);
            });
        });
    });
};

// Helper for tm.tmpid().
source.tmpid = function(id, md5) { return tm.tmpid('tmsource:', id, md5) };

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
    opts.json = JSON.stringify({ vector_layers: data.vector_layers });

    new carto.Renderer().render(tm.sortkeys(opts), callback);
};

// Autodetect the extent (bounds) of a source.
source.extent = function(data) {
    var extent = (data.Layer||[]).reduce(function(memo, l) {
        // If SRS is not one of the known convertibles, skip.
        var srsname = tm.srsname[l.srs];
        if (['900913','WGS84'].indexOf(srsname) === -1) return memo;

        // Leave out any explicit extents. We want to try to detect here.
        var opts = _(l.Datasource).reduce(function(memo, val, key) {
            if (key !== 'extent') memo[key] = val;
            return memo;
        }, {});

        // Ugh. Also, Windows.
        if (opts.file && opts.file.charAt(0) !== '/') opts.base = url.parse(data.id).pathname;

        try {
            var extent = new mapnik.Datasource(opts).extent();
            if (srsname === '900913') extent = sm.convert(extent, 'WGS84');
            memo[0] = Math.max(-180, Math.min(extent[0], memo[0]));
            memo[1] = Math.max(-85.0511, Math.min(extent[1], memo[1]));
            memo[2] = Math.min(180, Math.max(extent[2], memo[2]));
            memo[3] = Math.min(85.0511, Math.max(extent[3], memo[3]));
        } catch(err) { console.error(err); }
        return memo;
    }, [Infinity,Infinity,-Infinity,-Infinity]);
    return extent[0] === Infinity ? [-180,-85.0511,180,85.0511] : extent;
};

// Initialize defaults and derived properties on source data.
source.normalize = function(data) {
    data = _(data).defaults(defaults);
    // Initialize deep defaults for _prefs, layers.
    data._prefs = _(data._prefs).defaults(defaults._prefs);
    data.Layer = data.Layer.map(function(l) {
        l = _(l).defaults(deflayer);
        // @TODO mapnikref doesn't distinguish between keys that belong in
        // layer properties vs. attributes...
        l.properties = _(l.properties).defaults(deflayer.properties);
        // Ensure datasource keys are valid.
        l.Datasource = _(l.Datasource).reduce(function(memo, val, key) {
            if (!mapnikref.datasources[l.Datasource.type]) return memo;
            if (key === 'type') memo[key] = val;
            if (key in mapnikref.datasources[l.Datasource.type]) memo[key] = val;
            // Set a default extent value for postgis based on the SRS.
            if (l.Datasource.type === 'postgis' && key === 'extent' && !val) {
                _(tm.srs).each(function(srs, id) {
                    if (l.srs !== srs) return;
                    memo[key] = tm.extent[id];
                });
            }
            return memo
        }, {});
        return l;
    });
    // Construct vector_layers info from layer properties if necessary.
    data.vector_layers = url.parse(data.id).protocol === 'tmsource:'
        ? data.Layer.map(function(l) {
            var info = {};
            info.id = l.id;
            if ('description' in l) info.description = l.description;
            if ('minzoom' in l.properties) info.minzoom = l.properties.minzoom;
            if ('maxzoom' in l.properties) info.maxzoom = l.properties.maxzoom;
            info.fields = [];
            try {
                var opts = _(l.Datasource).clone();

                // Ugh. Also, Windows.
                if (opts.file && opts.file.charAt(0) !== '/') opts.base = url.parse(data.id).pathname;

                var fields = new mapnik.Datasource(opts).describe().fields;
                info.fields = _(fields).reduce(function(memo, type, field) {
                    memo[field] = l.fields[field] || type;
                    return memo;
                }, {});
            } catch(err) {
                console.error(err);
            }
            return info;
        })
        : data.vector_layers;
    return data;
};

// Light read of style info.
source.info = function(id, callback) {
    var uri = url.parse(id);

    if (!protocolIsValid(uri.protocol))
        return callback(new Error('Invalid source protocol'));

    var load = function(data, callback) {
        data.id = id;
        return callback(null, data);
    };

    var loadRemote = function () {
        var loaded = false,
            url = uri.protocol === 'mapbox:' ?  tm.config().mapboxtile + uri.pathname + '.json' : id;
        if (tm.remote(id)) {
            load(_({}).defaults(tm.remote(id)), callback);
            loaded = true;
        }
        new TileJSON.get({
            uri: url,
            timeout: 5000
        }).asBuffer(function(err, data) {
            if (err) return callback(err);
            try { data = JSON.parse(data); }
            catch(err) { return callback(err); }
            if (!data.vector_layers) {
                tm.remote(id, undefined);
                return loaded || callback(new Error('Source ' + id + ' does not contain "vector_layers" key'));
            } else {
                tm.remote(id, data);
                return loaded || load(data, callback);
            }
        });
    };

    switch (uri.protocol) {
    case 'mapbox:':
        loadRemote();
        break;
    case 'tmsource:':
        fs.readFile(path.join(uri.pathname,'data.yml'), 'utf8', function(err, data) {
            if (err) return callback(err);
            try { data = yaml.load(data); }
            catch(err) { return callback(err); }
            return load(data, callback);
        });
        break;
    case 'http:':
        loadRemote();
        break;
    case 'https:':
        loadRemote();
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

// Generate a hash based on source pertinent source info.
// Hash changes when significant portions of the source have changed.
source.toHash = function(id, callback) {
    source.info(id, function(err, info) {
        if (err) return callback(err);
        info = _(info).reduce(function(memo, val, key) {
            if (key === 'mtime') return memo;
            if (key === '_prefs') return memo;
            memo[key] = val;
            return memo;
        }, {});
        callback(null, crypto.createHash('md5')
            .update(JSON.stringify(tm.sortkeys(info)))
            .digest('hex')
            .substr(0,8));
    });
};

// Grab mbtiles export info for a source. If no export exists and
// no export is in progress this will also kick off the export process.
source.mbtiles = function(id, force, callback) {
    source.toHash(id, function(err, hash) {
        if (err) return callback(err);
        var file = tm.config().cache + '/' + 'export-' + hash + '.mbtiles';
        if (force) return fs.unlink(file, function(err) {
            if (err && err.code !== 'ENOENT') return callback(err);
            tm.cleartask(function(err) {
                if (err) return callback(err);
                tm.copytask(id, 'mbtiles://' + file, callback);
            });
        });
        tm.copytask(id, 'mbtiles://' + file, callback);
    });
};

// Stream exported MBTiles on disk to dest.
source.toMBTiles = function(id, dest, callback) {
    callback = callback || function() {};
    if (!id) return callback(new Error('id is required.'));
    if (!dest) return callback(new Error('dest stream is required.'));

    source.toHash(id, function(err, hash) {
        if (err) return callback(err);

        // If dest is an HTTP response object, set an appropriate header.
        if (dest.writable && dest.setHeader) {
            var basename = path.basename(id, '.tm2');
            dest.setHeader('content-disposition', 'attachment; filename="'+basename+'.mbtiles"');
            dest.setHeader('content-type', 'application/x-sqlite3');
        }

        var file = tm.config().cache + '/' + 'export-' + hash + '.mbtiles';
        try {
            var read = fs.createReadStream(file, { flags:'r', autoClose:true });
            read.pipe(dest);
            read.on('error', callback);
            read.on('end', callback);
            dest.on('error', callback);
        } catch(err) { callback(err); }
    });
};
