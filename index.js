#!/usr/bin/env node

// increase the libuv threadpool size to 1.5x the number of logical CPUs.
process.env.UV_THREADPOOL_SIZE = Math.ceil(Math.max(4, require('os').cpus().length * 1.5));

process.title = 'tm2';

if (process.platform === 'win32') {
    // HOME is undefined on windows
    process.env.HOME = process.env.USERPROFILE;
    // Add custom library paths to the PATH
    process.env.PATH = path.join(__dirname,"node_modules/mapnik/lib/binding/");
}

var _ = require('underscore');
var qs = require('querystring');
var tm = require('./lib/tm');
var fs = require('fs');
var url = require('url');
var path = require('path');
var source = require('./lib/source');
var style = require('./lib/style');
var middleware = require('./lib/middleware');
var express = require('express');
var cors = require('cors');
var config = require('optimist')
    .config('config')
    .options('db', {
        describe: 'path to tm2 db',
        default: path.join(process.env.HOME, '.tilemill', 'v2', 'app.db')
    })
    .options('mapboxauth', {
        describe: 'URL to mapbox auth API',
        default: 'https://api.mapbox.com'
    })
    .options('port', {
        describe: 'Port to run tm2 on',
        default: '3000'
    })
    .argv;
tm.config(config);
var request = require('request');
var crypto = require('crypto');

var basemaps = {};

var app = express();
app.use(express.bodyParser());
app.use(require('./lib/oauth'));
app.use(app.router);
app.use('/app', express.static(__dirname + '/app', { maxAge:3600e3 }));
app.use('/ext', express.static(__dirname + '/ext', { maxAge:3600e3 }));

// Check for authentication credentials. If present, check with test API
// call. Otherwise, lock the app and redirect to authentication.
function auth(req, res, next) {
    if (!tm.db._docs.oauth) return res.redirect('/authorize');
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
                auth(req, res, next);
            });
        } else {
            try { body = JSON.parse(body); }
            catch(err) { return next(err); }
            req.basemap = basemaps[tm.db._docs.oauth.account] = body;
            next();
        }
    });
};

// Check for an active export. If present, redirect to the export page
// effectively locking the application from use until export is complete.
function exporting(req, res, next) {
    tm.copytask(null, null, function(err, job) {
        if (err) {
            next(err);
        } else if (job && (req.path !== '/mbtiles' || req.query.id !== job.id)) {
            res.redirect('/mbtiles?id=' + job.id);
        } else {
            next();
        }
    });
};

app.param('style', auth, exporting, middleware.loadStyle);

app.param('source', auth, exporting, middleware.loadSource);

app.param('history', middleware.history);

app.put('/style.json', middleware.writeStyle, function(req, res, next) {
    res.send({
        _recache: false,
        mtime: req.style.data.mtime,
        background: req.style.data.background
    });
});

app.get('/:style(style.json)', function(req, res, next) {
    res.send(req.style.data);
});

app.get('/:style(style):history()', function(req, res, next) {
    res.set({'content-type':'text/html'});

    // identify user's OS for styling docs shortcuts
    var agent = function() {
        var agent = req.headers['user-agent'];
        if (agent.indexOf('Win') != -1) return 'windows';
        if (agent.indexOf('Mac') != -1) return 'mac';
        if (agent.indexOf('X11') != -1 || agent.indexOf('Linux') != -1) return 'linux';
        return 'mac'; // default to Mac.
    };

    try {
        var page = tm.templates.style({
            cwd: process.env.HOME,
            fontsRef: require('mapnik').fonts(),
            cartoRef: require('carto').tree.Reference.data,
            sources: [req.style._backend._source.data],
            style: req.style.data,
            history: req.history,
            basemap: req.basemap,
            user: tm.db._docs.user,
            test: 'test' in req.query,
            agent: agent()
        });
    } catch(err) {
        return next(new Error('style template: ' + err.message));
    }
    return res.send(page);
});

app.get('/:style(style|source)/:z(\\d+)/:x(\\d+)/:y(\\d+).grid.json', function(req, res, next) {
    var z = req.params.z | 0;
    var x = req.params.x | 0;
    var y = req.params.y | 0;
    req.style.getGrid(z,x,y, function(err, data, headers) {
        if (err && err.message === 'Tilesource not loaded') {
            return res.redirect(req.path);
        } else if (err) {
            return next(err);
        }
        headers['cache-control'] = 'max-age=3600';
        res.set(headers);
        return res.json(data);
    });
});

app.get('/:style(style|source)/:z(\\d+)/:x(\\d+)/:y(\\d+).:format([\\w\\.]+)', cors(), function(req, res, next) {
    var z = req.params.z | 0;
    var x = req.params.x | 0;
    var y = req.params.y | 0;
    var source = req.params.format === 'vector.pbf'
        ? req.style._backend._source
        : req.style;
    var done = function(err, data, headers) {
        if (err && err.message === 'Tilesource not loaded') {
            return res.redirect(req.path);
        } else if (err) {
            // Set errors cookie for this style.
            style.error(req.style.data.id, err);
            res.cookie('errors', _(style.error(req.style.data.id)).join('|'));
            return next(err);
        }

        // Set drawtime cookie for a given style.
        style.stats(req.style.data.id, 'drawtime', z, data._drawtime);
        res.cookie('drawtime', _(style.stats(req.style.data.id, 'drawtime'))
            .reduce(function(memo, stat, z) {
                memo.push([z,stat.min,stat.avg|0,stat.max].join('-'));
                return memo;
            }, []).join('.'));

        // Set srcbytes cookie for a given style.
        style.stats(req.style.data.id, 'srcbytes', z, data._srcbytes);
        res.cookie('srcbytes', _(style.stats(req.style.data.id, 'srcbytes')).
            reduce(function(memo, stat, z) {
                memo.push([z,stat.min,stat.avg|0,stat.max].join('-'));
                return memo;
            }, []).join('.'));

        // Clear out tile errors.
        res.cookie('errors', '');

        // If debug flag is set, reduce json data.
        if (done.format === 'json' && 'debug' in req.query) {
            data = _(data).reduce(function(memo, layer) {
                memo[layer.name] = {
                    features: layer.features.length,
                    jsonsize: JSON.stringify(layer).length
                };
                return memo;
            }, {});
        }

        headers['cache-control'] = 'max-age=3600';
        if (req.params.format === 'vector.pbf') {
            headers['content-encoding'] = 'deflate';
        }
        res.set(headers);
        return res.send(data);
    };
    if (req.params.format !== 'png') done.format = req.params.format;
    source.getTile(z,x,y, done);
});

app.get('/:style(style).xml', function(req, res, next) {
    res.set({'content-type':'text/xml'});
    return res.send(req.style._xml);
});

app.get('/:style(style).tm2z', function(req, res, next) {
    style.toPackage(req.style.data.id, res, function(err) {
        if (err) next(err);
        res.end();
    });
});

app.get('/upload', auth, function(req, res, next) {
    if (style.tmpid(req.query.styleid))
        return next(new Error('Style must be saved first'));
    if (typeof tm.db._docs.user.plan.tm2z == 'undefined' || !tm.db._docs.user.plan.tm2z)
        return next(new Error('You are not allowed access to tm2z uploads yet.'));

    style.upload({
        id: req.query.styleid,
        oauth: tm.db._docs.oauth,
        cache: tm._config.cache
    }, function(err){
        if (err) next(err);
        res.end();
    });
});

app.get('/:source(source).xml', function(req, res, next) {
    res.set({'content-type':'text/xml'});
    return res.send(req.source._xml);
});

app.get('/:source(source).mbtiles', function(req, res, next) {
    res.set({'content-type':'text/xml'});
    source.toMBTiles(req.source.data.id, res, function(err) {
        if (err) next(err);
        res.end();
    });
});

app.all('/mbtiles', function(req, res, next) {
    source.info(req.query.id, function(err, info) {
        if (err) return next(err);
        source.mbtiles(req.query.id, false, function(err, job) {
            if (err) return next(err);
            if (/application\/json/.test(req.headers.accept||'')) {
                res.send(job);
            } else {
                res.set({'content-type':'text/html'});
                res.send(tm.templates.export({
                    tm: tm,
                    job: job,
                    source: info
                }));
            }
        });
    });
});

app.all('/mbtiles.json', function(req, res, next) {
    if (req.method === 'DELETE') return tm.cleartask(function(err) {
        if (err) return next(err);
        res.send({});
    });
    source.info(req.query.id, function(err, info) {
        if (err) return next(err);
        source.mbtiles(req.query.id, req.method === 'PUT', function(err, job) {
            if (err) return next(err);
            res.send(job);
        });
    });
});

app.get('/:source(source):history()', function(req, res, next) {

    // identify user's OS for styling docs shortcuts
    var agent = function() {
        var agent = req.headers['user-agent'];
        if (agent.indexOf('Win') != -1) return 'windows';
        if (agent.indexOf('Mac') != -1) return 'mac';
        if (agent.indexOf('X11') != -1 || agent.indexOf('Linux') != -1) return 'linux';
        return 'mac'; // default to Mac.
    };

    res.set({'content-type':'text/html'});
    try {
        var page = tm.templates.source({
            tm: tm,
            cwd: process.env.HOME,
            remote: url.parse(req.query.id).protocol !== 'tmsource:',
            source: req.source.data,
            history: req.history,
            basemap: req.basemap,
            user: tm.db._docs.user,
            agent: agent()
        });
    } catch(err) {
        return next(new Error('source template: ' + err.message));
    }
    return res.send(page);
});

app.put('/source.json', middleware.writeSource, function(req, res, next) {
    res.send({
        mtime:req.source.data.mtime,
        vector_layers:req.source.data.vector_layers,
        _template:req.source.data._template
    });
});

app.get('/:source(source.json)', function(req, res, next) {
    res.send(req.source.data);
});

app.get('/browse*', function(req, res, next) {
    tm.dirfiles('/' + req.params[0], function(err, dirfiles) {
        if (err) return next(err);
        res.send(dirfiles);
    });
});

app.get('/thumb.png', function(req, res, next) {
    if (!req.query.id) return next(new Error('No id specified'));
    style.thumb(req.query.id, function(err, thumb) {
        if (err && err.message === 'Tile does not exist') {
            return res.send(err.toString(), 404);
        } else if (err) {
            return next(err);
        }
        var headers = {};
        headers['cache-control'] = 'max-age=3600';
        headers['content-type'] = 'image/png';
        res.set(headers);
        res.send(thumb);
    });
});

app.get('/font.png', function(req, res, next) {
    if (!req.query.id) return next(new Error('No id specified'));
    tm.font(req.query.id, function(err, buffer) {
        if (err) return next(err);
        var headers = {};
        headers['cache-control'] = 'max-age=3600';
        headers['content-type'] = 'image/png';
        res.set(headers);
        res.send(buffer);
    });
});

app.get('/app/lib.js', function(req, res, next) {
    res.set({
        'content-type':'application/javascript',
        'cache-control':'max-age=3600'
    });
    res.send(tm.templates.libjs({
        cartoRef: require('carto').tree.Reference.data
    }));
});

app.get('/new/style', exporting, middleware.writeStyle, function(req, res) {
    res.redirect('/style?id=' + req.style.data.id);
});

app.get('/new/source', exporting, middleware.writeSource, function(req, res, next) {
    res.redirect('/source?id=' + req.source.data.id + '#addlayer');
});

app.get('/', function(req, res, next) {
    res.redirect('/new/style');
});

app.del('/history/:type(style|source)', function(req, res, next) {
    if (!req.query.id) return next(new Error('No id specified'));
    tm.history(req.params.type,req.query.id, true);
    res.send(200);
});

app.use(function(err, req, res, next) {
    // Error on loading a tile, send 404.
    if (err && 'z' in req.params) return res.send(err.toString(), 404);

    console.error(err.stack);

    // Otherwise 500 for now.
    if (/application\/json/.test(req.headers.accept)) {
        res.set({'content-type':'application/javascript'});
        res.send({message:err.toString()}, 500);
    } else if (/text\/html/.test(req.headers.accept)) {
        res.send(tm.templates.error({ error:err }), 500);
    } else {
        res.send(err.toString(), 500);
    }
});

app.get('/geocode', auth, function(req, res, next) {
    var query = 'http://api.tiles.mapbox.com/v3/'+req.basemap.id+'/geocode/{query}.json';
    res.redirect(query.replace('{query}', req.query.search));
});

app.listen(config.port);
console.log('TM2 @ http://localhost:'+config.port+'/');
