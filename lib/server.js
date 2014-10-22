var path = require('path');
var _ = require('underscore');
var qs = require('querystring');
var tm = require('./tm');
var fs = require('fs');
var url = require('url');
var source = require('./source');
var style = require('./style');
var stats = require('./stats');
var middleware = require('./middleware');
var express = require('express');
var cors = require('cors');
var request = require('request');
var crypto = require('crypto');
var mapnik_omnivore = require('mapnik-omnivore');
var printer = require('abaculus');
var task = require('./task');
var getport = require('getport');
var app = express();
var saferstringify = require('safer-stringify');
var gazetteer = require('gazetteer');
var carto = require('carto');
var version = require('./../package.json').version.replace(/^\s+|\s+$/g, '');
var nocache = Math.random().toString(36).substr(-8);
var mapnik = require('mapnik');
if (!carto.tree.Reference.setVersion(mapnik.versions.mapnik)) {
    throw new Error("Could not set mapnik version to " + mapnik.versions.mapnik);
}

app.use(express.bodyParser());
app.use(require('./oauth'));
app.use(app.router);
app.use('/app', express.static(__dirname + '/../app', { maxAge:3600e3 }));
app.use('/ext', express.static(__dirname + '/../ext', { maxAge:3600e3 }));

middleware.style = [
    middleware.auth,
    middleware.exporting,
    middleware.loadStyle
];

middleware.source = [
    middleware.auth,
    middleware.exporting,
    middleware.loadSource
];

app.put('/style.json', middleware.writeStyle, function(req, res, next) {
    res.send({
        _recache: false,
        mtime: req.style.data.mtime,
        background: req.style.data.background
    });
});

app.get('/update', function(req, res, next) {
    res.send(tm.templates.update({
        nocache: nocache,
        latest: req.query.latest || null,
        version: req.query.current || null,
        error: false
    }));
});

app.get('/style.json', middleware.style, function(req, res, next) {
    res.send(req.style.data);
});

app.get('/style', middleware.style, middleware.history, middleware.examples, function(req, res, next) {
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
            nocache: nocache,
            gazetteer: gazetteer,
            cwd: tm.config().cwd,
            fontsRef: tm.fontfamilies(),
            cartoRef: carto.tree.Reference.data,
            sources: [req.style._backend._source.data],
            style: req.style.data,
            examples: req.examples,
            history: req.history,
            user: tm.db.get('user'),
            test: req.query.test,
            agent: agent(),
            saferstringify: saferstringify,
            version: version
        });
    } catch(err) {
        return next(new Error('style template: ' + err.message));
    }
    return res.send(page);
});

app.get('/source/:z(\\d+)/:x(\\d+)/:y(\\d+).grid.json', middleware.source, cors(), grid);

app.get('/style/:z(\\d+)/:x(\\d+)/:y(\\d+).grid.json', middleware.style, cors(), grid);

app.get('/source/:z(\\d+)/:x(\\d+)/:y(\\d+).:format([\\w\\.]+)', middleware.source, cors(), tile);

app.get('/source/:z(\\d+)/:x(\\d+)/:y(\\d+):scale(@\\d+x).:format([\\w\\.]+)', middleware.source, cors(), tile);

app.get('/style/:z(\\d+)/:x(\\d+)/:y(\\d+).:format([\\w\\.]+)', middleware.style, cors(), tile);

app.get('/style/:z(\\d+)/:x(\\d+)/:y(\\d+):scale(@\\d+x).:format([\\w\\.]+)', middleware.style, cors(), tile);

app.get('/static/:z,:x,:y/:px(\\d+)x:py(\\d+)@:scale(\\d+\.?\\d{0,})x:quality(\\d{0,}).:format([\\w\\.]+)', middleware.style, cors(), printFromCenter);

app.get('/static/:z/:w,:s,:e,:n@:scale(\\d+\.?\\d{0,})x:quality(\\d{0,}).:format([\\w\\.]+)', middleware.style, cors(), printFromBbox);

app.get('/source/:z,:lon,:lat.json', middleware.source, cors(), inspect);

app.get('/style/:z,:lon,:lat.json', middleware.style, cors(), inspect);

function inspect(req, res, next) {
    var lon = parseFloat(req.params.lon);
    var lat = parseFloat(req.params.lat);
    var z = parseInt(req.params.z, 10);

    // Tolerance at z0.
    var tolerance = Math.round(20037508.34 / 32 / Math.pow(2,z));

    req.style.queryTile(z, lon, lat, { tolerance:tolerance }, function(err, data, headers) {
        if (err) return next(err);
        res.set(headers);
        data.sort(function(a, b) {
            var ad = a.distance || 0;
            var bd = b.distance || 0;
            return ad < bd ? -1 : ad > bd ? 1 : 0;
        });
        data = data.reduce(function(memo, feature) {
            memo[feature.layer] = memo[feature.layer] || [];
            memo[feature.layer].push(feature);
            return memo;
        }, {});
        return res.json(data);
    });
}

function grid(req, res, next) {
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
}

function tile(req, res, next) {
    var z = req.params.z | 0;
    var x = req.params.x | 0;
    var y = req.params.y | 0;
    var scale = (req.params.scale) ? req.params.scale[1] | 0 : undefined;
    // limits scale to 4x (1024 x 1024 tiles or 288dpi) for now
    scale = scale > 4 ? 4 : scale;

    var id = req.source ? req.source.data.id : req.style.data.id;
    var source = req.params.format === 'vector.pbf'
        ? req.style._backend._source
        : req.style;
    var done = function(err, data, headers) {
        if (err && err.message === 'Tilesource not loaded') {
            return res.redirect(req.path);
        } else if (err) {
            // Set errors cookie for this style.
            style.error(id, err);
            res.cookie('errors', _(style.error(id)).join('|'));
            return next(err);
        }

        // Set drawtime/srcbytes cookies.
        stats.set(source, 'drawtime', z, data._drawtime);
        stats.set(source, 'srcbytes', z, data._srcbytes);
        res.cookie('drawtime', stats.cookie(source, 'drawtime'));
        res.cookie('srcbytes', stats.cookie(source, 'srcbytes'));

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
    done.scale = scale;
    if (req.params.format !== 'png') done.format = req.params.format;
    source.getTile(z,x,y, done);
}

function printFromCenter(req, res, next){
    // x & y are lng,lat at the center of the map
    var params = {};
    params.zoom = req.params.z | 0;
    params.center = {
        x: parseFloat(req.params.x),
        y: parseFloat(req.params.y),
        w: req.params.px | 0,
        h: req.params.py | 0
    };

    params.scale = (req.params.scale) ? parseFloat(req.params.scale) : undefined;
    params.scale = params.scale > 9 ? 8 : params.scale;
    params.format = (req.params.format !== 'png') ? req.params.format : 'png';
    params.quality = req.params.quality | 0 || null;
    params.limit = 20000;

    var filename = req.style.data.name + '-z' + params.zoom + '_' +
        req.params.x + '_' +
        req.params.y + '_' +
        (req.params.scale | 0);

    var source = req.params.format === 'vector.pbf'
        ? req.style._backend._source
        : req.style;

    params.getTile = source.getTile.bind(source);
    printer(params, function(err, image, header){
        if (err) return next(err);
        _(header).each(function(v, k) {
            res.set(k, v);
        });
        res.set({'Content-disposition': 'attachment; filename=' + filename + '.'+params.format});
        return res.send(image);
    });
}

function printFromBbox(req, res, next){
    // bbox is [w,s,e,n] boundaries for rectangle
    var params = {};
    params.zoom = req.params.z | 0;
    params.bbox = [req.params.w, req.params.s, req.params.e, req.params.n];
    params.scale = (req.params.scale) ? parseFloat(req.params.scale) : undefined;
    params.scale = params.scale > 9 ? 8 : params.scale;
    params.format = (req.params.format !== 'png') ? req.params.format : 'png';
    params.quality = req.params.quality | 0 || null;
    params.limit = 20000;

    var filename = req.style.data.name + '-z' +
        params.zoom + '_' + req.params.w +
        '_' + req.params.s + '_' + req.params.e +
        '_' + req.params.n + '_' + (req.params.scale | 0);

    var source = req.params.format === 'vector.pbf'
        ? req.style._backend._source
        : req.style;

    params.getTile = source.getTile.bind(source);
    printer(params, function(err, image, header){
        if (err) return next(err);
        _(header).each(function(v, k) {
            res.set(k, v);
        });
        res.set({'Content-disposition': 'attachment; filename=' + filename+ '.' + params.format});
        return res.send(image);
    });
}

app.get('/style.xml', middleware.style, function(req, res, next) {
    res.set({'content-type':'text/xml'});
    return res.send(req.style._xml);
});

app.get('/style.tm2z', middleware.style, function(req, res, next) {
    style.toPackage(req.style.data.id, res, function(err) {
        if (err) next(err);
        res.end();
    });
});

app.put('/style.upload.json', function(req, res, next) {
    return style.upload(req.query.id, function(err, job) {
        if (err && err.code) {
            res.send(err.code, err.message);
        } else if (err) {
            next(err);
        } else {
            res.send(job);
        }
    });
});

app.get('/upload', function(req, res, next) {
    source.info(req.query.id, function(err, info) {
        if (err) return next(err);
        source.upload(req.query.id, false, function(err, job) {
            if (err) return next(err);

            res.set({'content-type':'text/html'});
            res.send(tm.templates.export({
                nocache: nocache,
                tm: tm,
                job: job.toJSON(),
                source: info,
                test: req.query.test,
                saferstringify: saferstringify
            }));
        });
    });
});

app.all('/upload.json', function(req, res, next) {
    if (req.method === 'DELETE') {
        task.del();
        res.send({});
        return;
    }
    source.upload(req.query.id, req.method === 'PUT', function(err, job){
        if (err && err.code) {
            res.send(err.code, err.message);
        } else if (err) {
            next(err);
        } else {
           res.send(job);
        }
    });
});

app.get('/source.xml', middleware.source, function(req, res, next) {
    res.set({'content-type':'text/xml'});
    return res.send(req.source._xml);
});

app.get('/source.mbtiles', middleware.source, function(req, res, next) {
    res.set({'content-type':'text/xml'});
    source.toMBTiles(req.source.data.id, res, function(err) {
        if (err) next(err);
        res.end();
    });
});

app.get('/mbtiles', function(req, res, next) {
    source.info(req.query.id, function(err, info) {
        if (err) return next(err);
        source.mbtiles(req.query.id, false, function(err, job) {
            if (err) return next(err);

            if (/application\/json/.test(req.headers.accept||'')) {
                res.send(job);
            } else {
                res.set({'content-type':'text/html'});
                res.send(tm.templates.export({
                    nocache: nocache,
                    tm: tm,
                    job: job.toJSON(),
                    source: info,
                    test: req.query.test,
                    saferstringify: saferstringify
                }));
            }
        });
    });
});

app.all('/mbtiles.json', function(req, res, next) {
    if (req.method === 'DELETE') {
        task.del();
        res.send({});
        return;
    }

    source.mbtiles(req.query.id, req.method === 'PUT', function(err, job) {
        if (err) return next(err);
        res.send(job);
    });
});

app.get('/source', middleware.source, middleware.history, middleware.examples, function(req, res, next) {

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
            nocache: nocache,
            tm: tm,
            cwd: tm.config().cwd,
            remote: url.parse(req.query.id).protocol !== 'tmsource:',
            source: req.source.data,
            examples: req.examples,
            history: req.history,
            user: tm.db.get('user'),
            test: req.query.test,
            agent: agent(),
            saferstringify: saferstringify,
            version: version

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

app.get('/source.json', middleware.source, function(req, res, next) {
    res.send(req.source.data);
});

app.get('/browse', function(req, res, next) {
    tm.dirfiles(req.query.path, function(err, dirfiles) {
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
    tm.font(req.query.id, req.query.text||'', function(err, buffer) {
        if (err) return next(err);
        var headers = {};
        headers['cache-control'] = 'max-age=3600';
        headers['content-type'] = 'image/png';
        res.set(headers);
        res.send(buffer);
    });
});

app.get('/app/cartoref.js', function(req, res, next) {
    res.set({
        'content-type':'application/javascript',
        'cache-control':'max-age=3600'
    });
    res.send('window.cartoRef = ' + JSON.stringify(require('carto').tree.Reference.data) + ';');
});

app.get('/new/style', middleware.exporting, middleware.newStyle, function(req, res) {
    res.redirect('/style?id=' + req.style.data.id);
});

app.get('/new/source', middleware.exporting, middleware.newSource, function(req, res, next) {
    res.redirect('/source?id=' + req.source.data.id);
});

app.get('/', middleware.latest, function(req, res, next) {
    if (req.latest && req.latest.indexOf('tmstyle:') === 0) {
        res.redirect('/style?id=' + req.latest);
    } else if (req.latest && req.latest.indexOf('tmsource:') === 0) {
        res.redirect('/source?id=' + req.latest);
    } else {
        res.redirect('/new/style');
    }
});

app.get('/history.json', middleware.userTilesets, middleware.history, function(req, res, next) {
    res.send(req.history);
});

app.del('/history/:type(style|source)', function(req, res, next) {
    if (!req.query.id) return next(new Error('No id specified'));
    tm.history(req.query.id, true);
    res.send(200);
});

app.use(function(err, req, res, next) {
    // Error on loading a tile, send 404.
    if (err && req.params && 'z' in req.params) return res.send(err.toString(), 404);
    if (err && err.code === 'EOAUTH') return res.redirect('/authorize');
    if (err && err.status === 401) return res.redirect('/unauthorize');

    // Log errors if not testing.
    if (!tm.config().test) console.warn(500, req.method, req.url, err.toString());

    // Otherwise 500 for now.
    if (/application\/json/.test(req.headers.accept)) {
        res.set({'content-type':'application/javascript'});
        res.send({
            message: err.message,
            code: err.code
        }, 500);
    } else if (/text\/html/.test(req.headers.accept)) {
        res.send(tm.templates.error({
            nocache: nocache,
            error:err
        }), 500);
    } else {
        res.send(err.toString(), 500);
    }
});

app.get('/geocode', middleware.userTilesets, function(req, res, next) {
    var query = 'http://api.tiles.mapbox.com/v4/geocode/mapbox.places-v1/{query}.json?access_token=' + req.accesstoken;
    res.redirect(query.replace('{query}', req.query.search));
});

//Calls mapnik-omnivore for file's metadata
app.get('/metadata', function(req, res, next) {
    mapnik_omnivore.digest(req.query.file, function(err, metadata){
        if(err) return next(err);
        res.send(metadata);
    });
});

app.get('/config', function(req, res, next) {
    // save to environment variables
    fs.writeFile(path.join(process.env.HOME, '.mapbox-studio', 'atlasEnv.json'),  req.query, function(){
        
    })
});


// Include mock mapbox API routes if in test mode.
if (tm.config().test) require('./mapbox-mock')(app);

module.exports = app;

