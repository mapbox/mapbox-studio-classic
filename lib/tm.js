var _ = require('underscore');
var carto = require('carto');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var crypto = require('crypto');
var TileJSON = require('tilejson');
var Litenik = require('dt');
var tm = {};
var srs900913 = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over';

var defaults = {
    sources:[],
    styles:{},
    name:'',
    mtime:+new Date,
    center:[0,0,3],
    minzoom:0,
    maxzoom:22,
    _prefs: {
        saveCenter: true
    }
};

module.exports = tm;

tm.cacheProject = {};
tm.cacheBackend = {};

// Set or get config.
tm.db;
tm._config = {};
tm.config = function(opts) {
    if (!opts) return tm._config;

    tm._config = _(opts).defaults(tm._config);
    // @TODO create other paths (cache, etc.)
    try {
        mkdirp.sync(path.dirname(tm.config().db));
    } catch(err) { throw err; }

    // Load + compact the app database.
    var old = require('dirty')(tm.config().db);
    old.on('load', function() {
        fs.unlinkSync(tm.config().db);
        tm.db = require('dirty')(tm.config().db);
        old.forEach(function(k,v) { tm.db.set(k,v); });
    });

    return tm._config;
};
tm.config({
    db: path.join(process.env.HOME, '.tilemill', 'v2', 'app.db')
});

// Set or remove a project id from recent history.
tm.history = function(id, invalidate) {
    if (!id) return tm.db.get('history') || [];

    var history = tm.db.get('history')||[];
    history = invalidate
        ? _(history).reject(function(k) { return k === id; })
        : _(history.concat([id])).uniq();
    if (!_(history).isEqual(tm.db.get('history'))) tm.db.set('history', history);

    return history;
};

// @TODO.
tm.sources = _(fs.readdirSync(__dirname + '/../sources')).reduce(function(memo, file) {
    if (file.charAt(0) === '.') return memo;
    memo[file.split('.')[0]] = JSON.parse(fs.readFileSync(__dirname + '/../sources/' + file, 'utf8'));
    memo[file.split('.')[0]].id = file.split('.')[0];
    return memo;
}, {});

tm.templates = _(fs.readdirSync(__dirname + '/../templates')).reduce(function(memo, file) {
    if (file.charAt(0) === '.') return memo;
    memo[file.split('.')[0]] = _(fs.readFileSync(__dirname + '/../templates/' + file, 'utf8')).template();
    return memo;
}, {});

// Generate or verify that an id is a temporary one.
tm.tmpid = function(id) {
    if (id) return /tmp-[0-9a-f]{8}/.test(id);

    id = 'tmp-';
    var base16 = '0123456789abcdef';
    for (var i = 0; i < 8; i++) id += base16[Math.random() * 16 | 0];
    return id;
};

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
    var styles = [ {
        data: tm.templates.stylesdef(sources)
    } ].concat(_(data.styles).map(function(style) { return { data:style }; }));
    var layers =  sources.map(function(id) { return { name:id, srs:srs900913 } });

    new carto.Renderer().render({
        srs: srs900913,
        Layer: layers,
        Stylesheet: styles
    }, callback);
};

tm.project = function(options, callback) {
    var id = options.id;
    var data = options.data;
    var perm = options.perm;

    if (!data && tm.cacheProject[id]) return callback(null, tm.cacheProject[id]);

    // Load for reads/writes.
    var load = function(data, xml) {
        var opts = {};
        opts.xml = xml;
        opts.base = id;
        opts.backend = _(data.sources).map(function(sid) {
            tm.cacheBackend[sid] = tm.cacheBackend[sid] || new TileJSON(__dirname + '/../sources/'+sid+'.json', function() {});
            return tm.cacheBackend[sid];
        });
        if (tm.cacheProject[id]) {
            return tm.cacheProject[id].update(opts, function() {
                data.id = id;
                tm.cacheProject[id].data = data;
                return tm.project(_(options).extend({data:null}), callback);
            });
        } else {
            new Litenik(opts, function(err, project) {
                if (err) return callback(err);
                data.id = id;
                tm.cacheProject[id] = project;
                tm.cacheProject[id].data = data;
                return tm.project(_(options).extend({data:null}), callback);
            });
        }
    };

    // Reading.
    if (!data) return tm.projectInfo(id, function(err, data) {
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
    data = _(data).defaults(defaults);
    tm.toXML(data, function(err, xml) {
        if (err) return callback(err);
        data.mtime = +new Date;
        if (!perm) return load(data, xml);

        var files = _(data.styles).map(function(v,k) { return { basename:k, data:v }; });
        files.push({
            basename: 'project.json',
            data: JSON.stringify(_(data).reduce(function(memo,v,k) {
                if (!(k in defaults)) return memo;
                memo[k] = k === 'styles' ? _(v).keys() : v;
                return memo;
            }, {}), null, 2)
        });
        var writefiles = function() {
            if (!files.length) return load(data, xml);
            var file = files.shift();
            fs.writeFile(path.join(id, file.basename), file.data, function(err) {
                if (err) return callback(err);
                writefiles();
            });
        };
        mkdirp(id, function(err) {
            if (err) return callback(err);
            writefiles();
        });
    });
};

// Light read of project info.
tm.projectInfo = function(id, callback) {
    return fs.readFile(path.join(id,'project.json'), 'utf8', function(err, data) {
        if (err) return callback(err);
        try { data = JSON.parse(data); }
        catch(err) { return callback(err); }
        data._id = id;
        return callback(null, _(data).defaults(defaults));
    });
};
