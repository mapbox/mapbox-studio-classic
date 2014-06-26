var fs = require('fs');
var path = require('path');

// Mock mapbox API for testing.
module.exports = function(app) {
    app.use(app.router);
    app.get('/api/User/test', function(req, res, next) {
	    res.send({statusCode:200});
    });
    app.get('/api/Map', oauth, function(req, res, next) {
	    res.send([
            { id:'test.vector-source', metadata: { format:'pbf' } },
            { id:'test.raster-source', metadata: { format:'png' } }
        ]);
    });
    // Mocks the Mapbox tile API.
    app.get('/v4/:mapid.json', oauth, function(req, res, next) {
        var filepath = path.resolve(path.join(__dirname,'..','test','fixtures-mapboxapi',req.params.mapid + '.json'));
        try {
            var json = JSON.parse(fs.readFileSync(filepath));
        } catch(err) {
            return res.send(new Error(404));
        }
        res.send(json);
    });
    return app;
};

function oauth(req, res, next) {
    if (!req.query) return res.send(403);
    if (!(/12345678|testaccesstoken/).test(req.query.access_token)) return res.send(403);
    return next();
};
