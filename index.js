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
    var tmp = id && tm.tmpid(id);
    if (req.method === 'PUT') {
        var data = req.body;
    } else if (tmp && req.path === '/project') {
        var data = {
            styles: { 'style.mss': 'Map {\n  background-color:#b8dee6;\n}\n\n#country {\n    ::outline {\n    line-color: #85c5d3;\n    line-width: 2;\n    line-join: round;\n  }\n  polygon-fill:#fff;\n}' },
            sources: ['necountry']
        };
    } else {
        var data = false;
    }
    tm.project({
        id: id,
        data: data,
        perm: !tmp && !!data
    }, function(err, project) {
        if (err) return next(err);
        req.project = project;
        req.project.data._tmp = tmp;
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

app.get('/:newproject()', function(req, res, next) {
    res.redirect('/project?id=' + tm.tmpid());
});

app.listen(3000);
console.log('TM2 @ http://localhost:3000/')
