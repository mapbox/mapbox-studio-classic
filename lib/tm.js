var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');
var mkdirp = require('mkdirp');
var chrono = require('chrono');

var tm = {};

// Set or get config.
tm.db;
tm._config = {};
tm.config = function(opts) {
    if (!opts) return tm._config;

    tm._config = _(opts).defaults(tm._config);
    // @TODO create other paths (cache, etc.)
    try {
        mkdirp.sync(path.dirname(tm.config().db));
        mkdirp.sync(tm.config().cache);
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
    db: path.join(process.env.HOME, '.tilemill', 'v2', 'app.db'),
    cache: path.join(process.env.HOME, '.tilemill', 'v2', 'cache')
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

// Load templates.
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

// Writes an array of files defined by { basename:[basename], data:[data] }
tm.writefiles = function(basepath, files, callback) {
    var write = function() {
        if (!files.length) return callback();
        var file = files.shift();
        fs.writeFile(path.join(basepath, file.basename), file.data, function(err) {
            if (err) return callback(err);
            write();
        });
    };
    mkdirp(basepath, function(err) {
        if (err) return callback(err);
        write();
    });
};

module.exports = tm;
