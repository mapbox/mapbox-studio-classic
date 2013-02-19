var _ = require('underscore');
var qs = require('querystring');
var tm = require('./lib/tm');
var express = require('express');
var argv = require('optimist')
    .config('config')
    .argv;

var app = express();
app.use(express.bodyParser());
app.use(app.router);
app.use('/app', express.static(__dirname + '/app', { maxAge:3600e3 }));
app.use('/ext', express.static(__dirname + '/ext', { maxAge:3600e3 }));

app.param('project', function(req, res, next) {
    var id = req.query.id;
    var data = req.method === 'PUT' ? req.body : false;
    tm.project({
        id: id,
        data: data,
        perm: !!data,
        xray: req.query.xray
    }, function(err, project) {
        if (err) return next(err);
        req.project = project;
        return next();
    });
});

app.put('/:project(project)', function(req, res, next) {
    res.send({mtime:req.project.data.mtime});
});

app.get('/:project(project)', function(req, res, next) {
    res.set({'content-type':'text/html'});
    return res.send(tm.templates.project({
        cartoRef: require('carto').tree.Reference.data,
        sources: _(req.project.data.sources).map(function(s) {
            return tm.sources[s];
        }),
        library: _(tm.sources).filter(function(source, s) {
            return !_(req.project.data.sources).include(s);
        }),
        project: req.project.data
    }));
});

app.get('/:project(project)/:z/:x/:y.png', function(req, res, next) {
    var z = req.params.z | 0;
    var x = req.params.x | 0;
    var y = req.params.y | 0;
    req.project.getTile(z,x,y, function(err, data, headers) {
        if (err && err.message === 'Tilesource not loaded') {
            return res.redirect(req.path);
        } else if (err) {
            return next(err);
        }
        headers['cache-control'] = 'max-age=3600';
        res.set(headers);
        return res.send(data);
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

app.get('/', function(req, res, next) {
    res.set({'content-type':'text/html'});
    return res.send('Hello world');
});

app.listen(22209);
