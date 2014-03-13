var tm = require('../../lib/tm');

var express = require('express');
var app = express();
app.use(app.router);

app.get('/api/User/test?access_token=testaccesstoken', function(req, res, next) {
	console.log('test user');
	return {statusCode:200};
});

app.get('/api/Map/test.tm2-basemap?access_token=testaccesstoken', function(req, res, next) {
	console.log('test map');
	return {statusCode:200};
});

app.listen(3001);
console.log('mock server started @ locahost:3001')