// Run only by vendor node.
// In an ideal world this would be run in the same process/context of
// atom-shell but there are many hurdles atm, see
// https://github.com/atom/atom-shell/issues/533
var path = require('path');
var getport = require('getport');

// increase the libuv threadpool size to 1.5x the number of logical CPUs.
process.env.UV_THREADPOOL_SIZE = Math.ceil(Math.max(4, require('os').cpus().length * 1.5));

process.title = 'mapbox-studio';

if (process.platform === 'win32') {
    // HOME is undefined on windows
    process.env.HOME = process.env.USERPROFILE;
    // Add custom library paths to the PATH
    process.env.PATH = path.join(__dirname,'node_modules/mapnik/lib/binding/');
}

var tm = require('./lib/tm');
var server;
var config = require('minimist')(process.argv.slice(2));
config.shell = config.shell || false;
config.port = config.port || undefined;
config.test = config.test || false;
config.cwd = path.resolve(config.cwd || process.env.HOME);

if (!config.port) {
    getport(3000, 3999, configure);
} else {
    configure();
}

function configure(err, port) {
    if (err) throw err;
    config.port = config.port || port;
    tm.config(config, listen);
}

function listen(err) {
    if (err) throw err;
    server = require('./lib/server');
    if (config.shell) {
        server.listen(tm.config().port, '127.0.0.1', finish);
    } else {
        server.listen(tm.config().port, finish);
    }
}

function finish(err) {
    if (err) throw err;
    server.emit('ready');
    console.log('Mapbox Studio @ http://localhost:'+tm.config().port+'/');
}

