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

// Register default fonts.
mapnik.register_default_fonts();
mapnik.register_fonts(path.dirname(require.resolve('tm2-default-fonts')), { recurse: true });

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
    _prefs: {
        saveCenter: true
    }
};
var cache = {};

var project = function(options, callback) {
    var id = options.id;
    var uri = url.parse(id);
    var data = options.data;
    var perm = options.perm;

    if (uri.protocol !== 'tmstyle:')
        return callback(new Error('Invalid style protocol'));

    if (!data && cache[id]) return callback(null, cache[id]);

    // Load for reads/writes.
    var load = function(data, xml) {
        var done = function(err, p) {
            data.id = id;
            cache[id] = cache[id] || p;
            cache[id].data = data;
            cache[id].data.background = _('rgba(<%=r%>,<%=g%>,<%=b%>,<%=(a/255).toFixed(2)%>)').template(cache[id]._map.background);
            cache[id].stats = {};
            cache[id].errors = [];
            return callback(null, cache[id]);
        };
        var opts = {};
        opts.xml = xml;
        opts.base = !project.tmpid(id) && uri.pathname;
        opts.scale = data.scale || 1;
        opts.source = 'mapbox:///mapbox.mapbox-streets-v2';
        if (perm) project.thumb({
            id:id,
            perm:true
        });
        return cache[id] ? cache[id].update(opts, done) : new Vector(opts, done);
    };

    // Reading.
    if (!data) return project.info(id, function(err, data) {
        if (err) return callback(err);
        return project.toXML(data, function(err, xml) {
            if (err) return callback(err);
            return load(data, xml);
        });
    });

    // Writing.
    data = _(data).defaults(defaults);
    data._tmp = project.tmpid(id);
    project.toXML(data, function(err, xml) {
        if (err) return callback(err);
        data.mtime = +new Date;
        if (!perm) return load(data, xml);

        var files = _(data.styles).map(function(v,k) { return { basename:k, data:v }; });
        files.push({
            basename: 'project.yml',
            data: yaml.dump(tm.sortkeys(_(data).reduce(function(memo,v,k) {
                if (!(k in defaults)) return memo;
                switch (k) {
                // Styles are turned back into filename references.
                case 'styles':
                    memo[k] = _(v).keys();
                    break;
                // Self-referential source should be dereferenced back to '.';
                case 'source':
                    var suri = url.parse(v);
                    memo[k] = suri.protocol === 'tmsource:' && suri.pathname === uri.pathname ? '.' : v;
                    break;
                default:
                    memo[k] = v;
                    break;
                }
                return memo;
            }, {})), null, 2)
        });

        // Include XML in files to be written.
        files.push({ basename: 'project.xml', data: xml });

        tm.writefiles(uri.pathname, files, function(err) {
            if (err) return callback(err);
            load(data, xml);
        });
    });
};

// Generate or verify that an id is a temporary one.
project.tmpid = function(id, md5) {
    if (id && !md5) return /tmstyle:\/\/\/tmp-[0-9a-f]{8}/.test(id);

    if (id && md5) {
        return 'tmstyle:///tmp-' + crypto.createHash('md5').update(id).digest('hex').substr(0,8);
    } else {
        id = 'tmstyle:///tmp-';
        var base16 = '0123456789abcdef';
        for (var i = 0; i < 8; i++) id += base16[Math.random() * 16 | 0];
        return id;
    }
};

project.toXML = function(data, callback) {
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
                if (!backend.data.Layer) break;

                // @TODO currently using `help` key as defined on source to
                // determine available fields. Use a more robust method in the
                // future for handling this without I/O at this stage.
                var layer = backend.data.Layer.filter(function(l) { return l.id === data[key] }).shift();
                if (!layer || !layer.help) break;
                memo['interactivity'] = {
                    layer: data[key],
                    fields: Object.keys(layer.help)
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
        opts.Layer  = _(backend.data.Layer).map(function(layer) { return {
            id:layer.id,
            name:layer.id,
            properties:layer.properties||{},
            srs:tm.srs['900913']
        } });

        opts.Stylesheet = _(data.styles).map(function(style,basename) { return {
            id: basename,
            data: style
        }; });

        new carto.Renderer().render(tm.sortkeys(opts), callback);
    });
};

// Light read of project info.
project.info = function(id, callback) {
    var uri = url.parse(id);

    if (uri.protocol !== 'tmstyle:')
        return callback(new Error('Invalid style protocol'));

    return fs.readFile(path.join(uri.pathname,'project.yml'), 'utf8', function(err, data) {
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
            fs.readFile(path.join(uri.pathname, basename), 'utf8', function(err, mss) {
                if (err && err.code !== 'ENOENT') return callback(err);
                if (mss) stylesheets[basename] = mss;
                readstyles();
            });
        };
        readstyles();
    });
};

// Read/write the project thumb.
project.thumb = function(opts, callback) {
    callback = callback || function() {};

    if (project.tmpid(opts.id) && !opts.thumbpath)
        return callback(new Error('Tile does not exist'));

    var uri = url.parse(opts.id);
    opts.thumbpath = opts.thumbpath || path.join(uri.pathname,'.thumb.png');

    if (!opts.perm) return fs.readFile(opts.thumbpath, function(err, buffer) {
        if (err && err.code === 'ENOENT') return callback(new Error('Tile does not exist'));
        return callback(null, buffer);
    });

    return project({id:opts.id}, function(err, source) {
        if (err) return callback(err);
        var center = source.data.center;
        var xyz = sm.xyz([center[0],center[1],center[0],center[1]], center[2], false);
        source.getTile(center[2],xyz.minX,xyz.minY, function(err, buffer) {
            if (err) return callback(err);
            callback(null, buffer);
            // Save the thumb to disk.
            fs.writeFile(opts.thumbpath, buffer, function(err) {
                if (err) console.error(err);
            });
        });
    });
};

// Writes a tm2z tarball at filepath.
project.toPackage = function(options, callback) {
    if (!options.id) return callback(new Error('id is required.'));
    if (!options.filepath && !options.stream) return callback(new Error('filepath or stream is required.'));
    options.full = 'full' in options ? options.full : false;
    callback = callback || function() {};

    var uri = url.parse(options.id);

    // @TODO this extra read/write step can be removed in the future.
    // It is included to ensure the project.xml file is written, which
    // cannot be said of early tm2 projects.
    project({id:options.id}, function(err, source) {
        if (err) return callback(err);
        project({id:options.id, data:source.data}, function(err) {
            if (err) return callback(err);
            pack();
        });
    });

    function pack() {
        var writer = options.filepath
            ? fstream.Writer({ path: options.filepath, type: 'File' })
            : options.stream;
        var reader = fstream.Reader({
            path: uri.pathname,
            type: 'Directory',
            // Write project.xml first so streaming readers can load it first.
            sort: function(basename) {
                return basename.toLowerCase() === 'project.xml' ? -1 : 1;
            },
            filter: function(info) {
                if (options.full) return true;
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
project.stats = function(id, key, z, val) {
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
project.error = function(id, err) {
    if (!cache[id]) return false;
    cache[id].errors = cache[id].errors || [];
    if (err && cache[id].errors.indexOf(err.message) === -1) {
        cache[id].errors.push(err.message);
    }
    return cache[id].errors;
};

tilelive.protocols['tmstyle:'] = Style;
function Style(uri, callback) {
    if ('string' !== typeof uri) uri = url.format(uri);
    project({id:uri}, callback);
};

module.exports = project;
