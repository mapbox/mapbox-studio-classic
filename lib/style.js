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
var upload = require('mapbox-upload');
var task = require('./task');
var gazetteer = require('gazetteer');
var abaculus = require('abaculus');

var defaults = {
    name:'',
    description:'',
    attribution:'',
    source:'',
    styles:{},
    center:[0,0,3],
    bounds:[-180,-85.0511,180,85.0511],
    minzoom:0,
    maxzoom:22,
    format:'png8:m=h',
    template:'',
    interactivity_layer:'',
    layers:null,
    _properties: {},
    _prefs: {
        saveCenter: true,
        mapid: ''
    }
};
var cache = {};

module.exports = style;
tilelive.protocols['tmstyle:'] = style;
tilelive.protocols['tmpstyle:'] = style;

function style(arg, callback) {
    if ('string' !== typeof arg) {
        var id = url.format(arg);
        var uri = arg;
    } else {
        var id = arg;
        var uri = tm.parse(arg);
    }

    if (!uri || (uri.protocol !== 'tmstyle:' && uri.protocol !== 'tmpstyle:'))
        return callback(new Error('Invalid style protocol'));

    if (cache[id]) return callback(null, cache[id]);

    // Reading.
    style.info(id, function(err, data) {
        if (err) return callback(err);
        style.refresh(data, callback);
    });
};

// Load or refresh the relevant source using specified data.
style.refresh = function(data, callback) {
    var id = data.id;
    var uri = tm.parse(data.id);
    var xml = '';

    data = _(data).defaults(defaults);
    data._tmp = data._tmp || (style.tmpid(id) ? id : false);

    // validate key info keys.
    var err = tilelive.verify(data, [
        'name',
        'description',
        'attribution',
        'source',
        'center',
        'bounds',
        'minzoom',
        'maxzoom',
        'format',
        'template'
    ]);
    if (err) return callback(err);

    // validate custom layers.
    if (data.layers) {
        var err = style.layervalidate(data.layers);
        if (err) return callback(err);
    }

    // validate bookmarks.
    if (data._bookmarks) {
        var err = gazetteer.validate(data._bookmarks);
        if (err) return callback(err);
    }

    style.toXML(data, function(err, x) {
        if (err) return callback(err);
        xml = x;
        var opts = {};
        opts.xml = xml;
        opts.base = uri.dirname;
        return cache[id] ? cache[id].update(opts, done) : new Vector(opts, done);
    });

    function done(err, p) {
        if (err) return callback(err);
        cache[id] = cache[id] || p;
        cache[id].xml = xml;
        cache[id].data = data;
        cache[id].data.background = _('rgba(<%=r%>,<%=g%>,<%=b%>,<%=(a/255).toFixed(2)%>)').template(cache[id]._map.background);
        cache[id].stats = {};
        cache[id].errors = [];
        return callback(null, cache[id]);
    }
};

// Clear reference to cached style.
style.clear = function(id) {
    delete cache[id];
};

// Writing.
style.save = function(rawdata, callback) {
    var id = rawdata.id;
    var uri = tm.parse(rawdata.id);

    if (style.tmpid(id)) return callback(new Error('Cannot save temporary style ' + id));

    // Saving a tmp project permanently to a new location.
    // Copy tmp project first before saving.
    if (rawdata._tmp) {
        var src = tm.parse(rawdata._tmp).dirname;
        var dst = uri.dirname;
        var exclude = [ /^[\.\_]/, 'package.json' ];
        return tm.copydir(src, dst, exclude, function(err) {
            if (err) return callback(err);
            rawdata._tmp = false;
            style.save(rawdata, callback);
        });
    }

    style.refresh(rawdata, function(err, loaded) {
        if (err) return callback(err);

        var xml = loaded.xml;
        var data = loaded.data;

        // Save thumb optimistically (save completes even if thumb errors out).
        style.thumbSave(id);

        var files = _(data.styles).map(function(v,k) { return { basename:k, data:v }; });
        var filtered = tm.filterkeys(data, defaults);

        // Bookmarks saved to separate file.
        files.push({
            basename: 'bookmarks.yml',
            data: yaml.dump(data._bookmarks, null, 2)
        });

        // Styles are turned back into filename references.
        filtered.styles = _(filtered.styles).keys();
        files.push({
            basename: 'project.yml',
            data: yaml.dump(tm.sortkeys(filtered), null, 2)
        });

        // Include XML in files to be written.
        files.push({ basename: 'project.xml', data: xml });

        tm.writefiles(uri.dirname, files, function(err) {
            if (err) return callback(err);
            callback(null, loaded);
        });
    });
};

style.tmpid = function(id) {
    return id ? id.indexOf('tmpstyle:') === 0 : style.examples['mapbox-studio-default-style'];
};

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
        var layers;
        if (data.layers) {
            layers = data.layers.map(function(l) {
                return { id: l.split('.')[0], 'class': l.split('.')[1] }
            });
        // Normal vector source (both remote + local)
        } else if (backend.data.vector_layers) {
            layers = backend.data.vector_layers;
        // Assume image source
        } else {
            layers = [{id:'_image'}];
        }

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

        try {
            var xml = new carto.Renderer(null, {
                mapnik_version: mapnik.versions.mapnik
            }).render(tm.sortkeys(opts));
        } catch(err) {
            return callback(err);
        }
        return callback(null, xml);
    });
};

// Light read of style info.
style.info = function(id, callback) {
    var uri = tm.parse(id);

    if (uri.protocol !== 'tmstyle:' && uri.protocol !== 'tmpstyle:')
        return callback(new Error('Invalid style protocol'));
    var project_path = path.join(uri.dirname,'project.yml');
    return fs.readFile(project_path, 'utf8', function(err, data) {
        if (err) return callback(err);
        try { data = yaml.load(data); }
        catch(err) { return callback(err); }

        // Might be valid yaml and yet not be an object.
        // Error out appropriately.
        if (!(data instanceof Object)) {
            return callback(new Error('Invalid YAML: ' + project_path));
        }

        // Migrate sources key to source.
        if (Array.isArray(data.sources)) {
            data.source = data.sources[0];
            delete data.sources;
        }

        data.id = id;
        data.source = (function(s) {
            switch(s) {
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

        // Provide a reference to the origin of the tmp project.
        // If/when it is saved it will be used to copy the original
        // project's files fully before saving.
        data._tmp = style.tmpid(id) ? id : false;

        var stylesheets = {};
        readbookmarks();

        function readbookmarks() {
            // Initialize bookmarks here.
            // They are not included in defaults object to keep from
            // being written to the main project.yml file.
            data._bookmarks = [];
            var bookmarks_path = path.join(uri.dirname,'bookmarks.yml');
            fs.readFile(bookmarks_path, 'utf8', function(err, bookmarks) {
                if (err && err.code !== 'ENOENT') return callback(err);

                // Bookmarks file is optional so continue style if not found.
                if (err) { return readstyles(); }

                try { data._bookmarks = yaml.load(bookmarks);}
                catch(err) { return callback(err); }

                readstyles();
            });
        };

        function readstyles() {
            if (!data.styles || !data.styles.length) {
                data.styles = stylesheets;
                return callback(null, _(data).defaults(defaults));
            }
            var basename = data.styles.shift();
            fs.readFile(path.join(uri.dirname, basename), 'utf8', function(err, mss) {
                if (err && err.code !== 'ENOENT') return callback(err);
                if (mss) stylesheets[basename] = mss;
                readstyles();
            });
        };
    });
};

// Read style thumb.
style.thumb = function(id, callback) {
    var uri = tm.parse(id);
    return fs.readFile(path.join(uri.dirname,'.thumb.png'), function(err, buffer) {
        if (err && err.code === 'ENOENT') {
            return callback(new Error('Tile does not exist'));
        };
        return callback(null, buffer);
    });
};

// Write style thumb
style.thumbSave = function(id, dest, callback) {
    callback = callback || function() {};

    var uri = tm.parse(id);
    dest = dest || path.join(uri.dirname,'.thumb.png');

    return style(id, function(err, source) {
        if (err) return callback(err);
        var params = {
            zoom: source.data.center[2],
            scale: 2,
            center: {
                x: source.data.center[0],
                y: source.data.center[1],
                w: 256,
                h: 256
            },
            getTile: source.getTile.bind(source)
        };

        abaculus(params, function(err, buffer) {
            if (err) return callback(err);
            callback(null, buffer);
            // Save the thumb to disk.
            fs.writeFile(dest, buffer, function(err) {
                if (err && err.code !== 'ENOENT') console.error(err);
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
    if (style.tmpid(id))
        return callback(new Error('temporary style must be saved first'));

    callback = callback || function() {};

    var uri = tm.parse(id);

    // If dest is an HTTP response object, set an appropriate header.
    if (dest.writable && dest.setHeader) {
        var basename = path.basename(uri.dirname, '.tm2');
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
            path: uri.dirname,
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
    }
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

style.upload = function(id, callback) {
    try {
        var oauth = tm.oauth();
    } catch(err) {
        return callback(err);
    }
    if (style.tmpid(id))
        return callback(new Error('Style must be saved first'));
    style.info(id, function(err, info) {
        if (err) return callback(err);
        try {
            var mapid = info._prefs.mapid || tm.mapid();
        } catch(err) {
            return callback(err);
        }
        var pckage = path.join(tm.config().cache, 'package-' + mapid + '.tm2z');
        style.toPackage(info.id, pckage, function(err) {
            if (err) return callback(err);
            createProg();
        });

        function createProg() {
            var prog;
            try {
                prog = upload({
                    file: pckage,
                    account: oauth.account,
                    accesstoken: oauth.accesstoken,
                    mapid: mapid,
                    mapbox: tm.config().MapboxAuth
                });
            } catch(err) {
                return callback(err);
            }
            prog.once('error', function(err) {
                return callback(err);
            });
            prog.once('finished', mapSaved);
            return prog;
        }

        function mapSaved() {
            info._prefs.mapid = mapid;
            style.save(info, function(err) {
                if (err) return callback(err);
                fs.unlink(pckage, function(err) {
                    if (err) return callback(err);
                    return callback(null, info);
                });
            });
        }
    });
};

style.layervalidate = function(layers) {
    if (!Array.isArray(layers))
        return new Error('Layers must be an array');

    for (var i = 0;  i < layers.length; i++) {
        if (/[~`!#$%\^&*+=\[\]\\';,/{}|\\"":<>\?]/g.test(layers[i]))
            return new Error('Invalid characters in layer ' + layers[i]);
    }
};

// Hash of ids to tmp example styles.
style.examples = [
    'mapbox-studio-default-style',
    'mapbox-studio-osm-bright',
    'mapbox-studio-mapbox-outdoors',
    'mapbox-studio-satellite-afternoon',
    'mapbox-studio-comic',
    'mapbox-studio-light',
    'mapbox-studio-run-bike-and-hike',
    'mapbox-studio-highcontrast',
    'mapbox-studio-wheatpaste',
    'mapbox-studio-pencil',
    'mapbox-studio-pirates',
    'mapbox-studio-looseleaf',
].reduce(function(memo, id) {
    memo[id] = 'tmpstyle://' + tm.join(path.dirname(require.resolve(id)));
    return memo;
}, {});

