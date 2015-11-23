var _ = require('underscore');
var path = require('path');
var url = require('url');
var request = require('request');
var source = require('../lib/source');
var style = require('../lib/style');
var task = require('../lib/task');
var tm = require('../lib/tm');
var queue = require('queue-async');

var middleware = {};

// Normalizes any paths set for id, source in the querystring.
// Addresses mixed forward/backslash characters on windows and non-encoded
// characters like spaces.
middleware.normalizePaths = function(req, res, next) {
    ['id','source','style'].forEach(function(key) {
        if (!req.query[key]) return;
        var uri = tm.parse(req.query[key]);
        //TODO: find places, where other normalization happens
        //sometimes there are forward slashes and
        //sometimes there are backword slashes
        //doesn't seem to hapen with sources
        var is_windows = ('win32' === process.platform);
        //not only check for Windows: but also if it's a local file or
        //a remote one: eg. tilejson source
        //match drives: 'x:\', 'x:/', 'X:\' and 'X:/'
        var is_local_path = /\/\/([a-z]):[\/\\]/i.test(req.query[key]);
        var protocol = uri.protocol ? uri.protocol + '//' : '';
        var host = ((is_windows && is_local_path) || !uri.host) ? '' : uri.host;
        req.query[key] = protocol + host + uri.dirname;
    });
    ['id','source'].forEach(function(key) {
        if (!req.body || !req.body[key]) return;
        var uri = tm.parse(req.body[key]);
        // The object returned when the url library parses paths from Windows
        // machines (e.g: file://c:\path) has the drive letter as the host
        // field, so we need to exclude the host from the normalised path
        // when we detect that it's a windows path.
        // update (@BergWerkGIS): since we now support saving to other drives
        // than C: we cannot throw away the drive letter
        var is_windows = ('win32' === process.platform);
        //not only check for Windows: but also if it's a local file or
        //a remote one: eg. tilejson source
        //match drives: 'x:\', 'x:/', 'X:\' and 'X:/'
        var is_local_path = /\/\/([a-z]):[\/\\]/i.test(req.body[key]);
        var protocol = uri.protocol ? uri.protocol + '//' : '';
        var host = ((is_windows && is_local_path) || !uri.host) ? '' : uri.host;
        req.body[key] = protocol + host + uri.dirname;
    });
    next();
};

// Load user tilesets from the Mapbox API and include in source history.
middleware.userTilesets = function(req, res, next) {
    try {
        var oauth = tm.oauth();
    } catch(err) {
        return next(err);
    }
    req.accesstoken = oauth.accesstoken;
    if (tm.oauth().isMapboxAPI) var uri = tm.apiConfig('MapboxAPIAuth')+'/api/Map?account='+oauth.account+'&_type=tileset&private=true&access_token='+oauth.accesstoken;
    else var uri = tm.apiConfig('MapboxAPITile')+'/atlas/maps';
    request(uri, function(err, resp, body) {
        if (err) return next(err);
        if (resp.statusCode !== 200) return next(new Error(resp.statusCode + ' GET ' + uri));
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

middleware.newStyle = function(req, res, next) {
    // Let source for new styles be specified via querystring.
    if (req.query && req.query.remote) {
        var id = req.query.remote.replace(', ',',');
        if (!(/^(https?:\/\/)|(mapbox:\/\/)/).test(id)) {
            id = 'mapbox:///' + id;
        }
        req.query.source = id;
    }
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
    } else if (activeTask && activeTask.type === 'upload' && (req.path !== '/upload' || req.query.id !== activeTask.id)) {
        res.redirect('/upload?id=' + activeTask.id);
    } else {
        next();
    }
};

middleware.config = function(req, res, next) {
    var endpoint = req.query.MapboxAPITile;
    if (/(?:http:\/\/)?a\.tiles\.mapbox\.com\/?/.test(endpoint)) endpoint = 'https://a.tiles.mapbox.com';
    else endpoint = endpoint.replace(/\/$/, '');

    request.get(endpoint, function(err, response, body){
        var error = new Error('Cannot find Mapbox API at ' + endpoint);
        if (err) return next(error);

        try {
            var api = JSON.parse(body).api;
        } catch (e) {
            return next(error);
        }

        if (api === 'mapbox') {
            tm.db.set('MapboxAPITile', endpoint);
            return res.redirect('/oauth/mapbox');
        }
        else if (api === 'atlas') {
            tm.db.set('MapboxAPITile', endpoint);
            return middleware.offlineConfig(req, res, next);
        }
        else return next(error);
    });
};

middleware.offlineConfig = function(req, res, next) {
    tm.db.set('oauth', {
        account: 'offline',
        accesstoken: '',
        isMapboxAPI: false
    });
    tm.db.set('user', {
        id:'offline',
        name:'Offline user',
        avatar:'/app/avatar.png'
    });
    res.redirect('/authorize');
};

module.exports = middleware;
