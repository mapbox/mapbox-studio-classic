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
app.use(app.router);
app.use('/app', express.static(__dirname + '/app', { maxAge:3600e3 }));
app.use('/ext', express.static(__dirname + '/ext', { maxAge:3600e3 }));

app.param('style', function(req, res, next) {
    if (req.method === 'PUT' && req.body._recache && req.query.id) {
        source.invalidate(req.body.sources[0], next);
    } else {
        next();
    }
}, function(req, res, next) {
    var id = req.query.id;
    var tmp = id && style.tmpid(id);
    var data = false;
    if (req.method === 'PUT') {
        var data = req.body;
    } else if (tmp && req.path === '/style') {
        var data = defaults.style;
    }
    style({
        id: id,
        data: data,
        perm: !tmp && !!data
    }, function(err, style) {
        if (err) return next(err);
        if (!tmp) tm.history('style', id);
        req.style = style;
        return next();
    });
}, function(req, res, next) {
    if (!req.style) return next();
    next();
});

app.param('source', function(req, res, next) {
    if (req.method === 'PUT' && req.query.id) {
        source.invalidate(req.query.id, next);
    } else {
        next();
    }
}, function(req, res, next) {
    var id = req.query.id;
    var tmp = id && source.tmpid(id);
    var data = false;
    if (req.method === 'PUT') {
        var data = req.body;
    } else if (tmp && req.path === '/source') {
        var data = {};
    }
    source({
        id: id,
        data: data,
        perm: !tmp && !!data
    }, function(err, source) {
        if (err) return next(err);
        if (!tmp) tm.history('source', id);
        req.source = source;
        req.style = style;
        return next();
    });
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

app.put('/:style(style)', function(req, res, next) {
    res.send({
        _recache:false,
        mtime:req.style.data.mtime,
        background:req.style.data.background
    });
});

app.get('/:style(style):history()', function(req, res, next) {
    res.set({'content-type':'text/html'});
    return res.send(tm.templates.style({
        cwd: process.env.HOME,
        cartoRef: require('carto').tree.Reference.data,
        sources: [req.style._backend.data],
        library: _(source.library).filter(function(source, s) {
            return !_(req.style.data.sources).include(s);
        }),
        style: req.style.data,
        history: req.history
    }));
});

app.get('/:style(style|source)/:z/:x/:y.grid.json', function(req, res, next) {
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

app.get('/:style(style|source)/:z/:x/:y.:format', function(req, res, next) {
    var z = req.params.z | 0;
    var x = req.params.x | 0;
    var y = req.params.y | 0;
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

        headers['cache-control'] = 'max-age=3600';
        res.set(headers);
        return res.send(data);
    };
    done.format = req.params.format || 'png';
    req.style.getTile(z,x,y, done);
});

app.get('/:style(style).xml', function(req, res, next) {
    res.set({'content-type':'text/xml'});
    return res.send(req.style._xml);
});

app.get('/:source(source).xml', function(req, res, next) {
    res.set({'content-type':'text/xml'});
    return res.send(req.source._xml);
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

app.put('/:source(source)', function(req, res, next) {
    res.send({
        mtime:req.source.data.mtime
    });
});

app.get('/export/:style(package)', function(req, res, next) {
    var basename = path.basename(req.style.data.id, '.tm2');
    res.setHeader('content-disposition', 'attachment; filename="'+basename+'.tm2z"');
    style.toPackage({
        id: req.style.data.id,
        stream: res
    }, function(err) {
        if (err) next(err);
        res.end();
    });
});

app.get('/browse*', function(req, res, next) {
    tm.dirfiles('/' + req.params[0], function(err, dirfiles) {
        if (err) return next(err);
        res.send(dirfiles);
    });
});

app.get('/thumb.png', function(req, res, next) {
    if (!req.query.id) return next(new Error('No id specified'));
    style.thumb({id:req.query.id}, function(err, thumb) {
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
