#!/usr/bin/env node

// increase the libuv threadpool size to 1.5x the number of logical CPUs.
process.env.UV_THREADPOOL_SIZE = Math.ceil(Math.max(4, require('os').cpus().length * 1.5));

var _ = require('underscore');
var qs = require('querystring');
var tm = require('./lib/tm');
var fs = require('fs');
var url = require('url');
var path = require('path');
var source = require('./lib/source');
var style = require('./lib/style');
var express = require('express');
var cors = require('cors');
var argv = require('optimist')
    .config('config')
    .argv;

// Load defaults for new styles.
var defaults = {};
style.info('tmstyle://' + path.dirname(require.resolve('tm2-default-style')), function(err, info) {
    if (err) throw err;
    var data = JSON.parse(JSON.stringify(info));
    delete data.id;
    defaults.style = data;
});

var app = express();
app.use(express.bodyParser());
app.use(require('./lib/oauth'));
app.use(app.router);
app.use('/app', express.static(__dirname + '/app', { maxAge:3600e3 }));
app.use('/ext', express.static(__dirname + '/ext', { maxAge:3600e3 }));

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

app.param('style', exporting, function(req, res, next) {
    // @TODO...
    if (req.method === 'PUT' && req.body._recache && req.query.id) {
        source.invalidate(req.body.source, next);
    } else {
        next();
    }
}, function(req, res, next) {
    var id = req.query.id;
    var tmp = id && style.tmpid(id);
    var data = false;
    var done = function(err, s) {
        if (err) return next(err);
        if (!tmp) tm.history('style', id);
        req.style = s;
        return next();
    };
    if (req.method === 'PUT') {
        style.save(req.body, done);
    } else if (tmp && req.path === '/style') {
        style.save(_({id:id}).defaults(defaults.style), done);
    } else {
        style(id, done);
    }
}, function(req, res, next) {
    if (!req.style) return next();
    next();
});

app.param('source', exporting, function(req, res, next) {
    if (req.method === 'PUT' && req.query.id) {
        source.invalidate(req.query.id, next);
    } else {
        next();
    }
}, function(req, res, next) {
    var id = req.query.id;
    var tmp = id && source.tmpid(id);
    var data = false;
    var done = function(err, s) {
        if (err) return next(err);
        if (!tmp) tm.history('source', id);
        req.source = s;
        return next();
    };
    if (req.method === 'PUT') {
        source.save(req.body, done);
    } else if (tmp && req.path === '/source') {
        source.save({id:id}, done);
    } else {
        source(id, done);
    }
});

app.param('history', function(req, res, next) {
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
});

app.all('/:style(style.json)', function(req, res, next) {
    if (req.method === 'GET') return res.send(req.style.data);
    if (req.method === 'PUT') return res.send({
        _recache:false,
        mtime:req.style.data.mtime,
        background:req.style.data.background
    });
    next();
});

app.get('/:style(style):history()', function(req, res, next) {
    res.set({'content-type':'text/html'});
    return res.send(tm.templates.style({
        cwd: process.env.HOME,
        fontsRef: require('mapnik').fonts(),
        cartoRef: require('carto').tree.Reference.data,
        sources: [req.style._backend.data],
        style: req.style.data,
        history: req.history
    }));
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
        ? req.style._backend
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
    res.set({'content-type':'text/html'});
    return res.send(tm.templates.source({
        tm: tm,
        cwd: process.env.HOME,
        remote: url.parse(req.query.id).protocol !== 'tmsource:',
        source: req.source.data,
        history: req.history
    }));
});

app.all('/:source(source.json)', function(req, res, next) {
    if (req.method === 'GET') return res.send(req.source.data);
    if (req.method === 'PUT') return res.send({
        mtime:req.source.data.mtime,
        vector_layers:req.source.data.vector_layers,
        _template:req.source.data._template
    });
    next();
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

app.get('/new/style', function(req, res, next) {
    res.redirect('/style?id=' + style.tmpid());
});

app.get('/new/source', function(req, res, next) {
    res.redirect('/source?id=' + source.tmpid());
});

app.get('/', function(req, res, next) {
    res.redirect('/style?id=' + style.tmpid());
});

//app.use(function(err, req, res, next) {
//    // Error on loading a tile, send 404.
//    if (err && 'z' in req.params) return res.send(err.toString(), 404);
//    // Otherwise 500 for now.
//    if (/application\/json/.test(req.headers.accept)) {
//        res.set({'content-type':'application/javascript'});
//        res.send({message:err.toString()}, 500);
//    } else if (/text\/html/.test(req.headers.accept)) {
//        res.send(tm.templates.error({ error:err }));
//    } else {
//        res.send(err.toString(), 500);
//    }
//});

app.listen(3000);
console.log('TM2 @ http://localhost:3000/');
