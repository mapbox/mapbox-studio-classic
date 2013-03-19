var _ = require('underscore');
var carto = require('carto');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var Vector = require('tilelive-vector');
var sm = new (require('sphericalmercator'));
var yaml = require('js-yaml');
var tm = require('./tm');
var source = require('./source');

var srs900913 = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over';
var defaults = {
    name:'',
    description:'',
    attribution:'',
    sources:[],
    styles:{},
    mtime:+new Date,
    center:[0,0,3],
    minzoom:0,
    maxzoom:22,
    scale:1,
    _prefs: {
        saveCenter: true
    }
};
var cache = {};

var project = function(options, callback) {
    var id = options.id;
    var data = options.data;
    var perm = options.perm;

    if (!data && cache[id]) return callback(null, cache[id]);

    // Load for reads/writes.
    var load = function(data, xml) {
        var done = function(err, p) {
            data.id = id;
            cache[id] = cache[id] || p;
            cache[id].data = data;
            cache[id].data.background = _('rgba(<%=r%>,<%=g%>,<%=b%>,<%=(a/255).toFixed(2)%>)').template(cache[id]._map.background);
            return callback(null, cache[id]);
        };
        var opts = {};
        opts.xml = xml;
        opts.base = !tm.tmpid(id) ? id : opts.base;
        opts.scale = data.scale || 1;
        source({id:data.sources[0], base:data._id}, function(err, backend) {
            if (err) return callback(err);
            opts.backend = backend;
            return cache[id] ? cache[id].update(opts, done) : new Vector(opts, done);
        });
    };

    // Reading.
    if (!data) return project.info(id, function(err, data) {
        if (err) return callback(err);
        var stylesheets = {};
        var readstyles = function() {
            if (!data.styles || !data.styles.length) {
                data.styles = stylesheets;
                return project.toXML(data, function(err, xml) {
                    if (err) return callback(err);
                    return load(data, xml);
                });
            }
            var basename = data.styles.shift();
            fs.readFile(path.join(id, basename), 'utf8', function(err, mss) {
                if (err && err.code !== 'ENOENT') return callback(err);
                if (mss) stylesheets[basename] = mss;
                readstyles();
            });
        };
        readstyles();
    });

    // Writing.
    data = _(data).defaults(defaults);
    project.toXML(data, function(err, xml) {
        if (err) return callback(err);
        data.mtime = +new Date;
        if (!perm) return load(data, xml);

        var files = _(data.styles).map(function(v,k) { return { basename:k, data:v }; });
        files.push({
            basename: 'project.yml',
            data: yaml.dump(_(data).reduce(function(memo,v,k) {
                if (!(k in defaults)) return memo;
                memo[k] = k === 'styles' ? _(v).keys() : v;
                return memo;
            }, {}), null, 2)
        });
        tm.writefiles(id, files, function(err) {
            if (err) return callback(err);
            load(data, xml);
            project.thumb({id:id, perm:true});
        });
    });
};

project.toXML = function(data, callback) {
    source({id:data.sources[0], base:data._id}, function(err, backend) {
        if (err) return callback(err);

        // Convert datatiles sources to mml layers.
        var layers = _(backend.data.Layer).map(function(layer) { return {
            id:layer.id,
            name:layer.id,
            properties:layer.properties||{},
            srs:srs900913
        } });

        // These empty style declarations ensure layers are declared in Carto's
        // MML output and match up with the layer indices in the datatiles.
        var styles = [ {
            data: tm.templates.stylesdef(layers)
        } ].concat(_(data.styles).map(function(style,basename) { return {
            id: basename,
            data: style
        }; }));

        new carto.Renderer().render({
            srs: srs900913,
            Layer: layers,
            Stylesheet: styles
        }, callback);
    });
};

// Light read of project info.
project.info = function(id, callback) {
    return fs.readFile(path.join(id,'project.yml'), 'utf8', function(err, data) {
        if (err) return callback(err);
        try { data = yaml.load(data); }
        catch(err) { return callback(err); }
        data._id = id;
        return callback(null, _(data).defaults(defaults));
    });
};

// Read the project thumb.
project.thumb = function(opts, callback) {
    callback = callback || function() {};

    if (!opts.perm) return fs.readFile(path.join(opts.id,'.thumb.png'), function(err, buffer) {
        if (!err && buffer) return callback(null, buffer);
        if (err && err.code !== 'ENOENT') return callback(err);
        project.thumb({id:opts.id, perm:true}, callback);
    });

    return project({id:opts.id}, function(err, source) {
        if (err) return callback(err);
        var center = source.data.center;
        var xyz = sm.xyz([center[0],center[1],center[0],center[1]], center[2], false);
        source.getTile(center[2],xyz.minX,xyz.minY, function(err, buffer) {
            if (err) return callback(err);
            callback(null, buffer);
            // Save the thumb to disk.
            fs.writeFile(path.join(opts.id,'.thumb.png'), buffer, function(err) {
                if (err) console.error(err);
            });
        });
    });
};

module.exports = project;
