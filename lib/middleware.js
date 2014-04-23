var _ = require('underscore');
var path = require('path');
var request = require('request');
var source = require('../lib/source');
var style = require('../lib/style');
var tm = require('../lib/tm');

// Load defaults for new styles
var defaults = {};
style.info('tmstyle://' + path.dirname(require.resolve('tm2-default-style')), function(err, info) {
    if (err) throw err;
    var data = JSON.parse(JSON.stringify(info));
    delete data.id;
    defaults.style = data;
});

// In-memory basemap cache
var basemaps = {};

var middleware = {};

middleware.history = function(req, res, next) {
    req.history = {};
    var history = tm.history();
    var types = Object.keys(history);

    if (!types.length) return next();

    var load = function(type, queue) {
        if (!queue.length && !types.length) return next();
        if (!queue.length) {
            type = types.shift();
            queue = history[type].slice(0);
            return load(type, queue);
        }
        var id = queue.shift();
        var method = type === 'style' ? style.info : source.info;
        method(id, function(err, info) {
            if (err) {
                tm.history(type, id, true);
            } else {
                req.history[type] = req.history[type] || {};
                req.history[type][id] = info;
            }
            load(type, queue);
        });
    };
    var type = types.shift();
    var queue = history[type].slice(0);
    load(type, queue);
};

middleware.writeStyle = function(req, res, next) {
    var data = req.body.id ? req.body : _({id:style.tmpid()}).defaults(defaults.style);
    var write = function(err) {
        if (err) return next(err);
        style.save(data, function(err, s) {
            if (err) return next(err);
            if (!tm.tmpid('tmstyle:', s.data.id)) tm.history('style', s.data.id);
            req.style = s;
            next();
        });
    }
    if (data._recache && req.query.id) return source.invalidate(req.body.source, write);
    write();
}

middleware.loadStyle = function(req, res, next) {
    style(req.query.id, function(err, s) {
        // if (err.code === 'ENOENT' && style.tmpid(path.dirname(err.path).slice(1)) return writeStyle(req, res, next);
        if (err) return next(err);
        if (!tm.tmpid('tmstyle:', s.data.id)) tm.history('style', s.data.id);
        req.style = s;
        next();
    });
};

middleware.writeSource = function(req, res, next) {
    var data = req.body.id ? req.body : {id: source.tmpid()};
    source.save(data, function(err, s) {
        if (err) return next(err);
        if (!source.tmpid(s.data.id)) tm.history('source', s.data.id);
        req.source = s;
        next();
    });
};

middleware.loadSource = function(req, res, next) {
    source(req.query.id, function(err, s) {
        if (err) return next(err);
        if (!source.tmpid(s.data.id)) tm.history('source', s.data.id);
        req.source = s;
        next();
    });
};

middleware.auth = function(req, res, next) {
    if (!tm.db._docs.oauth) return res.redirect('/authorize');
    next();
};

middleware.basemap = function(req, res, next) {
    if (!tm.db._docs.oauth) return next(new Error('Must authenticate to load basemap'));

    if (basemaps[tm.db._docs.oauth.account]) {
        req.basemap = basemaps[tm.db._docs.oauth.account];
        return next();
    }
    request(tm._config.mapboxauth+'/api/Map/'+tm.db._docs.oauth.account+'.tm2-basemap?access_token='+tm.db._docs.oauth.accesstoken, function(error, response, body) {
        if (error) {
            return next(error);
        }

        if (response.statusCode >= 400) {
            var data = {
                '_type': 'composite',
                'center': [0,0,3],
                'created': 1394571600000,
                'description': '',
                'id': tm.db._docs.oauth.account+'.tm2-basemap',
                'layers': ['base.mapbox-streets+bg-e8e0d8_landuse_water_buildings_streets'],
                'name': 'Untitled project',
                'new': true,
                'private': true
            };
            request({
                method: 'PUT',
                uri: tm._config.mapboxauth+'/api/Map/'+tm.db._docs.oauth.account+'.tm2-basemap?access_token='+tm.db._docs.oauth.accesstoken,
                headers: {'content-type': 'application/json'},
                body: JSON.stringify(data)
            }, function(error, response, body) {
                if (!response.statusCode === 200) return res.redirect('/unauthorize');
                // Map has been written successfully but we don't have a fresh
                // copy to cache and attach to req.basemap. Run the middleware
                // again which will do a GET that should now be successful.
                middleware.auth(req, res, next);
            });
        } else {
            try { body = JSON.parse(body); }
            catch(err) { return next(err); }
            req.basemap = basemaps[tm.db._docs.oauth.account] = body;
            next();
        }
    });
};

module.exports = middleware;