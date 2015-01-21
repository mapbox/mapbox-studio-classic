// Run only by vendor node.
// In an ideal world this would be run in the same process/context of
// atom-shell but there are many hurdles atm, see
// https://github.com/atom/atom-shell/issues/533

// increase the libuv threadpool size to 1.5x the number of logical CPUs.
process.env.UV_THREADPOOL_SIZE = Math.ceil(Math.max(4, require('os').cpus().length * 1.5));
process.title = 'mapbox-studio';

if (process.platform === 'win32') {
    // HOME is undefined on windows
    process.env.HOME = process.env.USERPROFILE;
    // NULL out PATH to avoid potential conflicting dlls
    process.env.PATH = '';
}

var tm = require('./lib/tm');
var path = require('path');
var getport = require('getport');
var package_json = require('./package.json');
var server;
var config = require('minimist')(process.argv.slice(2));
config.shell = config.shell || false;
config.port = config.port || undefined;
config.test = config.test || false;
config.cwd = path.resolve(config.cwd || process.env.HOME);
var logger = require('fastlog')('', 'debug', '<${timestamp}>');

var usage = function usage() {
  var str = [
      ''
    , '  Usage: mbstudio [options]'
    , ''
    , '  where [options] is any of:'
    , '    --version - Returns running version then exits'
    , '    --port - Port to run on (default: ' + config.port + ')'
    , '    --cwd - Working directory to run within (default: ' + config.cwd + ')'
    // TODO - are these used?
    , '    --shell - (default: ' + config.shell + ')'
    , '    --test - (default: ' + config.test + ')'
    , ''
    , 'mbstudio@' + package_json.version + '  ' + path.resolve(__dirname, '..')
    , 'node@' + process.versions.node
  ].join('\n')
  return str
}

if (config.version) {
    logger.debug(package_json.version);
    process.exit(0);
}

if (config.help || config.h) {
    logger.debug(usage());
    process.exit(0);
}

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
    logger.debug('Mapbox Studio @ http://localhost:'+tm.config().port+'/');
}

