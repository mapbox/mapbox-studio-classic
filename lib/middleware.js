var _ = require('underscore');
var path = require('path');
var request = require('request');
var source = require('../lib/source');
var style = require('../lib/style');
var task = require('../lib/task');
var tm = require('../lib/tm');

// Load defaults for new styles
var defaults = {};
style.info('tmstyle://' + path.dirname(require.resolve('tm2-default-style')), function(err, info) {
    if (err) throw err;
    var data = JSON.parse(JSON.stringify(info));
    delete data.id;
    defaults.style = data;
});

var middleware = {};

// Load user tilesets from the Mapbox API and include in source history.
middleware.userTilesets = function(req, res, next) {
    var oauth = tm.db.get('oauth');
    if (!oauth) return next(new Error('oauth required'));
    req.accesstoken = oauth.accesstoken;
    var url = tm.config().mapboxauth+'/api/Map?account='+oauth.account+'&_type=tileset&private=true&access_token='+oauth.accesstoken;
    request(url, function(err, resp, body) {
        if (err) return next(err);
        if (resp.statusCode !== 200) return next(new Error(resp.statusCode + ' GET ' + url));
        var tilesets;
        try { tilesets = JSON.parse(body); } catch(err) { next(err); }
        tilesets.forEach(function(t) {
            if (!t.metadata) return;
            if (t.metadata.format !== 'pbf') return;
            tm.history('mapbox:///' + t.id);
        });
        next();
    });
};

middleware.history = function(req, res, next) {
    req.history = { style:{}, source:{} };
    var queue = tm.history().slice(0);
    load();

    function load() {
        if (!queue.length) return next();
        var id = queue.shift();
        var type = id.indexOf('tmstyle://') === 0 ? 'style' : 'source';
        var method = type === 'style' ? style.info : source.info;
        method(id, function(err, info) {
            if (err) {
                tm.history(id, true);
            } else {
                req.history[type] = req.history[type] || {};
                req.history[type][id] = info;
            }
            load();
        });
    }
};

middleware.latest = function(req, res, next) {
    middleware.history(req, res, function(err) {
        if (err) return next(err);
        var history = tm.history();
        for (var i = (history.length - 1); i > 0; i--) {
            if (history[i].indexOf('tmstyle://') === 0 ||
                history[i].indexOf('tmsource://') === 0) {
                req.latest = history[i];
                return next();
            }
        }
        next();
    });
};

middleware.writeStyle = function(req, res, next) {
    var data = req.body && req.body.id ? req.body : _({id:style.tmpid()}).defaults(defaults.style);

    var write = function(err) {
        if (err) return next(err);
        style.save(data, function(err, s) {
            if (err) return next(err);
            if (!style.tmpid(s.data.id)) tm.history(s.data.id);
            req.style = s;
            next();
        });
    }
    if (data._recache && req.query.id) return source.invalidate(req.body.source, write);

    // Let source for new styles be specified via querystring.
    if (!req.body.id && req.query && req.query.source) return source(req.query.source, function(err, s) {
        if (err) return next(err);
        data.styles = {
            'style.mss': tm.templates.xraydefaultcarto(s.data.vector_layers)
        };
        data.source = req.query.source;
        write();
    });

    write();
}

middleware.loadStyle = function(req, res, next) {
    style(req.query.id, function(err, s) {
        if (err && err.code === 'ENOENT' && style.tmpid(req.query.id)) return middleware.writeStyle(req, res, next);
        if (err) return next(err);
        if (!style.tmpid(s.data.id)) tm.history(s.data.id);
        req.style = s;
        next();
    });
};

middleware.writeSource = function(req, res, next) {
    var data = req.body && req.body.id ? req.body : {id: source.tmpid()};
    source.save(data, function(err, s) {
        if (err) return next(err);
        if (!source.tmpid(s.data.id)) tm.history(s.data.id);
        req.source = s;
        next();
    });
};

middleware.loadSource = function(req, res, next) {
    source(req.query.id, function(err, s) {
        if (err && err.code === 'ENOENT' && source.tmpid(req.query.id)) return middleware.writeSource(req, res, next);
        if (err) return next(err);
        if (!source.tmpid(s.data.id)) tm.history(s.data.id);
        req.source = s;
        req.style = s.style;
        next();
    });
};

middleware.auth = function(req, res, next) {
    if (!tm.db.get('oauth')) {
        var err = new Error('No active OAuth account');
        err.code = 'EOAUTH';
        return next(err);
    }
    next();
};

// Check for an active export. If present, redirect to the export page
// effectively locking the application from use until export is complete.
middleware.exporting = function(req, res, next) {
    var activeTask = task.get();
    if (activeTask && activeTask.type === 'export' && (req.path !== '/mbtiles' || req.query.id !== activeTask.id)) {
        res.redirect('/mbtiles?id=' + activeTask.id);
    }else if (activeTask && activeTask.type === 'upload' && (req.path !== '/upload' || req.query.id !== activeTask.id)) {
        res.redirect('/upload?id=' + activeTask.id);
    } else {
        next();
    }
};

module.exports = middleware;
