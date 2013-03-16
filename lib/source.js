var _ = require('underscore');
var carto = require('carto');
var fs = require('fs');
var path = require('path');
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
var defaults = {};

var cache = {};

var source = function(options, callback) {
    var id = options.id;
    var data = options.data;
    var perm = options.perm;

    if (!data && cache[id]) return callback(null, cache[id]);

    // Load for reads/writes.
    var load = function(data, xml) {
        var done = function(err, p) {
            if (err) return callback(err);
            data.id = id;
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

    // Reading.
    if (!data) return source.info(id, function(err, data) {
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

        var files = [{
            basename: 'project.yml',
            data: yaml.dump(data, null, 2)
        }];
        tm.writefiles(id, files, function(err) {
            if (err) return callback(err);
            load(data, xml);
        });
    });
};

// @TODO
source.library = _(fs.readdirSync(__dirname + '/../sources')).reduce(function(memo, file) {
    if (file.charAt(0) === '.') return memo;
    memo[file.split('.')[0]] = yaml.load(fs.readFileSync(__dirname + '/../sources/' + file, 'utf8'));
    memo[file.split('.')[0]].id = file.split('.')[0];
    return memo;
}, {});

source.toXML = function(data, callback) {
    if (data.tiles) return callback();

    new carto.Renderer().render({
        srs: srs900913,
        Layer: data.Layer,
        Stylesheet: [{ data:tm.templates.stylesdef(data.Layer) }]
    }, callback);
};

// Light read of project info.
source.info = function(id, callback) {
    if (source.library[id]) return callback(null, source.library[id]);

    return fs.readFile(path.join(id,'project.yml'), 'utf8', function(err, data) {
        if (err) return callback(err);
        try { data = yaml.load(data); }
        catch(err) { return callback(err); }
        data._id = id;
        return callback(null, _(data).defaults(defaults));
    });
};

module.exports = source;
