var express = require('express');
var app = express();
app.use(app.router);

app.get('/api/User/test', function(req, res, next) {
	res.send({statusCode:200});
});
app.get('/api/Map/test.tm2-basemap', function(req, res, next) {
	res.send({statusCode:200});
});
app.get('/api/Map', function(req, res, next) {
    if (!req.query) return res.send(403);
    if (req.query.access_token != '12345678') return res.send(403);
	res.send([
        { id:'test.vector-source', metadata: { format:'pbf' } },
        { id:'test.raster-source', metadata: { format:'png' } }
    ]);
});

if (require.main === module) {
    // If this script is executed directly...
    app.listen(3001);
    console.log('mock server started @ locahost:3001');
} else {
    // If this module is required in another script...
    var server;
    module.exports.start = function (callback) {
        server = app.listen(3001, callback);
    };
    module.exports.stop = function(callback) {
        server.close(callback);
    };
}
