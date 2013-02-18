var _ = require('underscore');
var carto = require('carto');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var TileJSON = require('tilejson');
var Litenik = require('dt');
var tm = {};
var srs900913 = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over';
module.exports = tm;

tm.cacheProject = {};
tm.cacheBackend = {};

// @TODO.
tm.sources = _(fs.readdirSync(__dirname + '/../sources')).reduce(function(memo, file) {
    if (file.charAt(0) === '.') return memo;
    memo[file.split('.')[0]] = JSON.parse(fs.readFileSync(__dirname + '/../sources/' + file, 'utf8'));
    return memo;
}, {});

tm.templates = _(fs.readdirSync(__dirname + '/../templates')).reduce(function(memo, file) {
    if (file.charAt(0) === '.') return memo;
    memo[file.split('.')[0]] = _(fs.readFileSync(__dirname + '/../templates/' + file, 'utf8')).template();
    return memo;
}, {});

tm.toXML = function(data, callback) {
    // Convert datatiles sources to mml layer IDs.
    var sources = _(data.sources).chain()
        .filter(function(source) { return tm.sources[source] })
        .map(function(source) { return _(tm.sources[source].layers).keys() })
        .compact()
        .flatten()
        .value();
    // These empty style declarations ensure layers are declared in Carto's
    // MML output and match up with the layer indices in the datatiles.
    var defstyles = sources.map(function(id) { return '#' + id + ' {}' }).join('\n');
    var styles = [ {data:defstyles} ].concat(_(data.styles).map(function(style) { return { data:style }; }));
    var layers =  sources.map(function(id) { return { id:id, name:id, srs:srs900913 } })

    new carto.Renderer().render({
        srs: srs900913,
        Layer: layers,
        Stylesheet: styles
    }, function(err, xml) {
        if (err) return callback(err);
        var lines = xml.split('\n');
        var cleaned = [];
        var open = false;
        var line;
        while (lines.length) {
            line = lines.shift();
            if (/<Datasource>/.test(line)) {
                open = true;
            } else if (/<\/Datasource>/.test(line)) {
                open = false;
            } else if (!open) {
                cleaned.push(line);
            }
        };
        return callback(null, cleaned.join('\n'));
    });
};

tm.project = function(id, data, perm, callback) {
    if (!data && tm.cacheProject[id]) return callback(null, tm.cacheProject[id]);

    // Load for reads/writes.
    var load = function(data, xml) {
        var sid = data.sources[0];
        tm.cacheBackend[sid] = tm.cacheBackend[sid] || new TileJSON(__dirname + '/../sources/'+sid+'.json', function() {});
        new Litenik({
            backend: tm.cacheBackend[sid],
            xml: xml
        }, function(err, project) {
            if (err) return callback(err);
            data.id = id;
            project.data = data;
            tm.cacheProject[id] = project;
            return tm.project(id, false, false, callback);
        });
    };

    // Reading.
    if (!data) return fs.readFile(path.join(id,'project.json'), 'utf8', function(err, data) {
        if (err) return callback(err);
        try { data = JSON.parse(data); }
        catch(err) { return callback(err); }
        var stylesheets = {};
        var readstyles = function() {
            if (!data.styles || !data.styles.length) {
                data.styles = stylesheets;
                return tm.toXML(data, function(err, xml) {
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
    tm.toXML(data, function(err, xml) {
        if (err) return callback(err);
        var files = [];
        if (perm) {
            _(data.styles).map(function(v,k) { return { basename:k, data:v }; });
            files.push({
                basename: 'project.json',
                data: JSON.stringify(_(data).reduce(function(memo,v,k) {
                    if (['sources','name','styles'].indexOf(k) === -1) return memo;
                    memo[k] = k === 'styles' ? _(v).keys() : v;
                    return memo;
                }, {}), null, 2)
            });
        }
        var writefiles = function() {
            if (!files.length) return load(data, xml);
            var file = files.shift();
            fs.writeFile(path.join(id, file.basename), file.data, function(err) {
                if (err) return callback(err);
                writefiles();
            });
        };
        writefiles();
    });
};
