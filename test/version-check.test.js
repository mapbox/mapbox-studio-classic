var test = require('tape');
var assert = require('assert');
var http = require('http');
var versionCheck = require('../lib/version-check');

function Server() {
    return http.createServer(function (req, res) {
        switch (req.url) {
        case '/mapbox-studio/latest':
            res.writeHead(200);
            res.end("0.0.3");
            break;
        case '/mapbox-studio/whitespace':
            res.writeHead(200);
            res.end(" 0.0.3");
            break;
        default:
            res.writeHead(404);
            res.end(JSON.stringify({message:'Not found'}));
            break;
        }
    }).listen(3002);
};

var server,
	options = {
	host: 'localhost',
	port: 3002,
	path: '/mapbox-studio/latest',
	pckge: require('./fixtures-versioncheck/package.json')
};

test('version-check checks version', function(t) {
	server = Server();
    versionCheck(options, function(update, current, latest){
    	t.deepEqual(update, true);
    	t.deepEqual(current, '0.0.2');
    	t.deepEqual(latest, '0.0.3');
	    server.close();
	    t.end();
    });
});

test('version-check strips whitespace', function(t) {
	server = Server();
	options.pckge = require('./fixtures-versioncheck/whitespace-package.json')
    options.path = '/mapbox-studio/whitespace';
    versionCheck(options, function(update, current, latest){
    	t.deepEqual(update, false);
    	t.deepEqual(current, '0.0.3');
    	t.deepEqual(latest, '0.0.3');
	    server.close();
	    t.end();
    });
});

test('version-check ignores request errors', function(t) {
	server = Server();
    server.close();
    versionCheck(options, function(update, current, latest){
    	t.deepEqual(update, false);
    	t.deepEqual(current, undefined);
    	t.deepEqual(latest, undefined);
	    t.end();
    });
});
