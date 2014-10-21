var _ = require('underscore');
var path = require('path');
var request = require('request');
var source = require('../lib/source');
var style = require('../lib/style');
var task = require('../lib/task');
var tm = require('../lib/tm');
var queue = require('queue-async');

var middleware = {};

// Load user tilesets from the Mapbox API and include in source history.
middleware.userTilesets = function(req, res, next) {
    try {
        var oauth = tm.oauth();
    } catch(err) {
        return next(err);
    }
    req.accesstoken = oauth.accesstoken;
    var url = tm.config().MapboxAuth+'/api/Map?account='+oauth.account+'&_type=tileset&private=true&access_token='+oauth.accesstoken;
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
    var history = tm.history();
    var q = queue(10);
    for (var i = 0; i < history.length; i++) q.defer(function(id, done) {
        var type = id.indexOf('tmstyle://') === 0 ? 'style' : 'source';
        var method = type === 'style' ? style.info : source.info;
        method(id, function(err, info) {
            if (err) {
                tm.history(id, true);
            } else {
                req.history[type][id] = info;
            }
            done();
        });
    }, history[i]);
    q.awaitAll(next);
};

middleware.examples = function(req, res, next) {
    req.examples = { style:{}, source:{} };
    var examples = style.examples;
    var q = queue(10);
    for (var key in examples) q.defer(function(key, done) {
        var id = style.examples[key];
        var type = id.indexOf('tmpstyle://') === 0 ? 'style' : 'source';
        var method = type === 'style' ? style.info : source.info;
        method(id, function(err, info) {
            if (err) return done(err);
            done(null, {type:type, key:key, info:info});
        });
    }, key);
    q.awaitAll(function(err, loaded) {
        if (err) return next(err);
        loaded.forEach(function(obj) {
            req.examples[obj.type][obj.key] = obj.info;
        });
        next();
    });
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

middleware.newStyle = function(req, res, next) {
    // Let source for new styles be specified via querystring.
    if (req.query && req.query.source) {
        style.clear(style.tmpid());
        source(req.query.source, function(err, s) {
            if (err) return next(err);
            var data = {};
            data.id = style.tmpid();
            data.center = s.data.center;
            data.minzoom = s.data.minzoom;
            data.maxzoom = s.data.maxzoom;
            data.styles = { 'style.mss': tm.templates.xraydefaultcarto(s.data.vector_layers) };
            data.source = req.query.source;
            style.refresh(data, function(err, s) {
                if (err) return next(err);
                req.style = s;
                next();
            });
        });
    } else {
        var id = (req.query && req.query.id) || style.tmpid();
        style.clear(id);
        style(id, function(err, s) {
            if (err) return next(err);
            req.style = s;
            next();
        });
    }
};

middleware.writeStyle = function(req, res, next) {
    if (!req.body || !req.body.id) return next(new Error('id required'));

    var data = req.body;

    var write = function(err) {
        if (err) return next(err);
        var method = req.query && req.query.refresh ? 'refresh' : 'save';
        style[method](data, function(err, s) {
            if (err) return next(err);
            if (!style.tmpid(s.data.id)) tm.history(s.data.id);
            req.style = s;
            next();
        });
    }
    if (data._recache && req.query.id) {
        source.invalidate(req.body.source, write);
    } else {
        write();
    }
}

middleware.loadStyle = function(req, res, next) {
    style(req.query.id, function(err, s) {
        if (err) return next(err);
        if (!style.tmpid(s.data.id)) tm.history(s.data.id);
        req.style = s;
        next();
    });
};

middleware.newSource = function(req, res, next) {
    source.clear(source.tmpid());
    source(source.tmpid(), function(err, s) {
        if (err) return next(err);
        req.source = s;
        next();
    });
};

middleware.writeSource = function(req, res, next) {
    if (!req.body || !req.body.id) return next(new Error('id required'));
    var data = req.body;
    var method = req.query && req.query.refresh ? 'refresh' : 'save';
    source[method](data, function(err, s) {
        if (err) return next(err);
        if (!source.tmpid(s.data.id)) tm.history(s.data.id);
        req.source = s;
        next();
    });
};

middleware.loadSource = function(req, res, next) {
    source(req.query.id, function(err, s) {
        if (err) return next(err);
        if (!source.tmpid(s.data.id)) tm.history(s.data.id);
        req.source = s;
        req.style = s.style;
        next();
    });
};

middleware.auth = function(req, res, next) {
    try {
        var oauth = tm.oauth();
    } catch(err) {
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
