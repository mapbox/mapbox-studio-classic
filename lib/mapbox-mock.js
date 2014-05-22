// Mock mapbox API for testing.
module.exports = function(app) {
    app.use(app.router);
    app.get('/api/User/test', function(req, res, next) {
	    res.send({statusCode:200});
    });
    app.get('/api/Map/test.tm2-basemap', function(req, res, next) {
	    res.send({statusCode:200});
    });
    app.get('/api/Map', function(req, res, next) {
        if (!req.query) return res.send(403);
        if (!(/12345678|testaccesstoken/).test(req.query.access_token)) return res.send(403);
	    res.send([
            { id:'test.vector-source', metadata: { format:'pbf' } },
            { id:'test.raster-source', metadata: { format:'png' } }
        ]);
    });
    return app;
};
