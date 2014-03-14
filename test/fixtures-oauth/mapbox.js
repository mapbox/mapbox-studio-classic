var express = require('express');
var app = express();
app.use(app.router);

app.get('/api/User/test', function(req, res, next) {
	res.send({statusCode:200});
});
app.get('/api/Map/test.tm2-basemap', function(req, res, next) {
	res.send({statusCode:200});
});

app.listen(3001);
console.log('mock server started @ locahost:3001')
