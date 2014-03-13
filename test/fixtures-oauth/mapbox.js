var express = require('express');
var app = express();
app.use(app.router);

app.get('/api/User/test?access_token=testaccesstoken', function(req, res, next) {
	console.log('test user');
	return false;
});

app.get('/api/Map/test.tm2-basemap?access_token=testaccesstoken', function(req, res, next) {
	console.log('test map');
	return false;
});

app.listen(3001);