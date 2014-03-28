var _ = require('underscore');
var carto = require('carto');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var Vector = require('tilelive-vector');
var sm = new (require('sphericalmercator'));
var yaml = require('js-yaml');
var tm = require('./tm');
var mapnik = require('mapnik');
var fstream = require('fstream');
var tar = require('tar');
var zlib = require('zlib');
var tilelive = require('tilelive');
var url = require('url');
var source = require('./source');

var defaults = {
    name:'',
    description:'',
    attribution:'',
    source:'',
    styles:{},
    mtime:+new Date,
    center:[0,0,3],
    bounds:[-180,-85.0511,180,85.0511],
    minzoom:0,
    maxzoom:22,
    scale:1,
    format:'png8:m=h',
    template:'',
    interactivity_layer:'',
    layers:null,
    _properties: {},
    _prefs: {
        saveCenter: true
    }
};
var cache = {};

module.exports = style;
tilelive.protocols['tmstyle:'] = style;

function style(arg, callback) {
    if ('string' !== typeof arg) {
        var id = url.format(arg);
        var uri = arg;
    } else {
        var id = arg;
        var uri = url.parse(arg);
    }

    if (uri.protocol !== 'tmstyle:')
        return callback(new Error('Invalid style protocol'));

    if (cache[id]) return callback(null, cache[id]);

    // Reading.
    style.info(id, function(err, data) {
        if (err) return callback(err);
        style.toXML(data, function(err, xml) {
            if (err) return callback(err);
            style.refresh(data, xml, callback);
        });
    });
};

// Load or refresh the relevant source using specified data + xml.
style.refresh = function(data, xml, callback) {
    var id = data.id;
    var uri = url.parse(data.id);
    var done = function(err, p) {
        if (err) return callback(err);
        cache[id] = cache[id] || p;
        cache[id].data = data;
        cache[id].data.background = _('rgba(<%=r%>,<%=g%>,<%=b%>,<%=(a/255).toFixed(2)%>)').template(cache[id]._map.background);
        cache[id].stats = {};
        cache[id].errors = [];
        return callback(null, cache[id]);
    };
    var opts = {};
    opts.xml = xml;
    opts.base = !style.tmpid(id) && uri.pathname;
    opts.scale = data.scale || 1;
    opts.source = 'mapbox:///mapbox.mapbox-streets-v2';
    return cache[id] ? cache[id].update(opts, done) : new Vector(opts, done);
};

// Writing.
style.save = function(data, callback) {
    var id = data.id;
    var uri = url.parse(data.id);
    var perm = !style.tmpid(id);

    data = _(data).defaults(defaults);
    data._tmp = style.tmpid(id);
    data.mtime = +new Date;

    style.toXML(data, function(err, xml) {
        if (err) return callback(err);
        if (!perm) return style.refresh(data, xml, callback);

        var files = _(data.styles).map(function(v,k) { return { basename:k, data:v }; });
        var filtered = tm.filterkeys(data, defaults);
        // Styles are turned back into filename references.
        filtered.styles = _(filtered.styles).keys();
        // Self-referential source should be dereferenced back to '.';
        var suri = url.parse(filtered.source);
        filtered.source = suri.protocol === 'tmsource:' && suri.pathname === uri.pathname ? '.' : filtered.source;
        files.push({
            basename: 'project.yml',
            data: yaml.dump(tm.sortkeys(filtered), null, 2)
        });

        // Include XML in files to be written.
        files.push({ basename: 'project.xml', data: xml });

        tm.writefiles(uri.pathname, files, function(err) {
            if (err) return callback(err);
            style.refresh(data, xml, function(err, p) {
                if (err) return callback(err);
                style.thumbSave(id);
                callback(null, p);
            });
        });
    });
};

// Helper for tm.tmpid().
style.tmpid = function(id, md5) { return tm.tmpid('tmstyle:', id, md5) };

// Render data to XML.
style.toXML = function(data, callback) {
    tilelive.load(data.source, function(err, backend) {
        if (err) return callback(err);

        // Include params to be written to XML.
        var opts = [
            'name',
            'description',
            'attribution',
            'bounds',
            'center',
            'format',
            'minzoom',
            'maxzoom',
            'scale',
            'source',
            'template',
            'interactivity_layer',
            'legend'
        ].reduce(function(memo, key) {
            if (key in data) switch(key) {
            // @TODO this is backwards because carto currently only allows the
            // TM1 abstrated representation of these params. Add support in
            // carto for "literal" definition of these fields.
            case 'interactivity_layer':
                if (!backend.data) break;
                if (!backend.data.vector_layers) break;
                var fields = data.template.match(/{{([a-z0-9\-_]+)}}/ig);
                if (!fields) break;
                memo['interactivity'] = {
                    layer: data[key],
                    fields: fields.map(function(t) { return t.replace(/[{}]+/g,''); })
                };
                break;
            default:
                memo[key] = data[key];
                break;
            }
            return memo;
        }, {});

        // Set projection for Mapnik.
        opts.srs = tm.srs['900913'];

        // Convert datatiles sources to mml layers.
        var layers = data.layers ? data.layers.map(function(l) {
            return { id: l.split('.')[0], 'class': l.split('.')[1] }
        }) : backend.data.vector_layers;
        opts.Layer = layers.map(function(layer) { return {
            id:layer.id,
            name:layer.id,
            'class':layer['class'],
            // Styles can provide a hidden _properties key with
            // layer-specific property overrides. Current workaround to layer
            // properties that could (?) eventually be controlled via carto.
            properties: (data._properties && data._properties[layer.id]) || {},
            srs:tm.srs['900913']
        } });

        opts.Stylesheet = _(data.styles).map(function(style,basename) { return {
            id: basename,
            data: style
        }; });

        new carto.Renderer().render(tm.sortkeys(opts), callback);
    });
};

// Light read of style info.
style.info = function(id, callback) {
    var uri = url.parse(id);

    if (uri.protocol !== 'tmstyle:')
        return callback(new Error('Invalid style protocol'));
    var project_path = unescape(path.join(uri.pathname,'project.yml'));
    return fs.readFile(project_path, 'utf8', function(err, data) {
        if (err) return callback(err);
        try { data = yaml.load(data); }
        catch(err) { return callback(err); }

        // Migrate sources key to source.
        if (Array.isArray(data.sources)) {
            data.source = data.sources[0];
            delete data.sources;
        }

        data.id = id;
        data.source = (function(s) {
            switch(s) {
            case '.':
                return 'tmsource://' + uri.pathname;
            // Legacy.
            case 'mbstreets':
                return 'mapbox:///mapbox.mapbox-streets-v2';
            }
            // Legacy.
            if (/^mapbox:\/\/[^\/]/.test(s)) {
                return s.replace('mapbox://', 'mapbox:///');
            } else {
                return s;
            }
        })(data.source);

        var stylesheets = {};
        var readstyles = function() {
            if (!data.styles || !data.styles.length) {
                data.styles = stylesheets;
                return callback(null, _(data).defaults(defaults));
            }
            var basename = data.styles.shift();
            fs.readFile(path.join(unescape(uri.pathname), basename), 'utf8', function(err, mss) {
                if (err && err.code !== 'ENOENT') return callback(err);
                if (mss) stylesheets[basename] = mss;
                readstyles();
            });
        };
        readstyles();
    });
};

// Read style thumb.
style.thumb = function(id, callback) {
    if (style.tmpid(id)) return callback(new Error('Tile does not exist'));

    var uri = url.parse(id);
    return fs.readFile(path.join(unescape(uri.pathname),'.thumb.png'), function(err, buffer) {
        if (err && err.code === 'ENOENT') {
            return callback(new Error('Tile does not exist'));
        };
        return callback(null, buffer);
    });
};

// Write style thumb
style.thumbSave = function(id, dest, callback) {
    callback = callback || function() {};

    var uri = url.parse(id);
    dest = dest || path.join(uri.pathname,'.thumb.png');

    return style(id, function(err, source) {
        if (err) return callback(err);
        var center = source.data.center;
        var xyz = sm.xyz([center[0],center[1],center[0],center[1]], center[2], false);
        source.getTile(center[2],xyz.minX,xyz.minY, function(err, buffer) {
            if (err) return callback(err);
            callback(null, buffer);
            // Save the thumb to disk.
            fs.writeFile(dest, buffer, function(err) {
                if (err) console.error(err);
            });
        });
    });
};

// Writes a tm2z tarball at filepath.
style.toPackage = function(id, dest, callback) {
    if (!id)
        return callback(new Error('id is required.'));
    if (typeof dest !== 'string' && !dest.writable)
        return callback(new Error('dest filepath or stream is required.'));

    callback = callback || function() {};

    var uri = url.parse(id);

    // If dest is an HTTP response object, set an appropriate header.
    if (dest.writable && dest.setHeader) {
        var basename = path.basename(uri.pathname, '.tm2');
        dest.setHeader('content-disposition', 'attachment; filename="'+basename+'.tm2z"');
    }

    // @TODO this extra read/write step can be removed in the future.
    // It is included to ensure the project.xml file is written, which
    // cannot be said of early tm2 styles.
    style(id, function(err, source) {
        if (err) return callback(err);
        style.save(source.data, function(err) {
            if (err) return callback(err);
            pack();
        });
    });

    function pack() {
        var writer = typeof dest === 'string'
            ? fstream.Writer({ path: dest, type: 'File' })
            : dest;
        var reader = fstream.Reader({
            path: uri.pathname,
            type: 'Directory',
            // Write project.xml first so streaming readers can load it first.
            sort: function(basename) {
                return basename.toLowerCase() === 'project.xml' ? -1 : 1;
            },
            filter: function(info) {
                if (info.props.basename[0] === '.') return false;
                if (info.props.basename[0] === '_') return false;
                if (info.props.type === 'Directory') return true;
                if (info.props.basename.toLowerCase() === 'project.xml') return true;
                var extname = path.extname(info.props.basename).toLowerCase();
                if (extname === '.png') return true;
                if (extname === '.jpg') return true;
                if (extname === '.svg') return true;
            }
        })
        .pipe(tar.Pack({ noProprietary:true }))
        .pipe(zlib.Gzip())
        .pipe(writer);
        reader.on('error', callback);
        writer.on('error', callback);
        writer.on('end', callback);
    };
};

// Set or get stats for a given zoom level.
style.stats = function(id, key, z, val) {
    if (!cache[id]) return false;
    if ('number' === typeof z && val) {
        cache[id].stats = cache[id].stats || {};
        cache[id].stats[key] = cache[id].stats[key] || {};
        cache[id].stats[key][z] = cache[id].stats[key][z] || { count:0 };
        var stats = cache[id].stats[key][z];
        stats.min = Math.min(val, stats.min||Infinity);
        stats.max = Math.max(val, stats.max||0);
        stats.avg = stats.count ? ((stats.avg * stats.count) + val) / (stats.count + 1) : val;
        stats.count++;
    }
    return cache[id].stats[key];
};

// Set or get tile serving errors.
style.error = function(id, err) {
    if (!cache[id]) return false;
    cache[id].errors = cache[id].errors || [];
    if (err && cache[id].errors.indexOf(err.message) === -1) {
        cache[id].errors.push(err.message);
    }
    return cache[id].errors;
};

