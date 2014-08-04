var atom = require('app');
var path = require('path');
var spawn = require('child_process').spawn;
var BrowserWindow = require('browser-window');

var node = path.resolve(path.join(__dirname, 'vendor', 'node'));
var script = path.resolve(path.join(__dirname, 'index-server.js'));

// Start the server child process.
var server = spawn(node, [script]);
server.on('exit', process.exit);
server.stdout.once('data', function(data) {
    var matches = data.toString().match(/Mapbox Studio @ http:\/\/localhost:([0-9]+)\//);
    if (!matches) {
        console.warn('Server port not found');
        process.exit(1);
    }
    serverPort = matches[1];
    loadURL();
});
server.stdout.pipe(process.stdout);
server.stderr.pipe(process.stderr);

var serverPort = null;
var mainWindow = null;

// Report crashes to our server.
require('crash-reporter').start();

atom.on('window-all-closed', function() {
    if (server) server.kill();
    process.exit();
});
atom.on('ready', makeWindow);

function makeWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 960,
        height: 600,
        title: 'Mapbox Studio',
        'node-integration': 'all',
        'web-preferences': {
            webgl: true,
            java: false,
            webaudio: false
        }
    });
    mainWindow.loadUrl('file://' + path.join(__dirname, 'app', 'loading.html'));
    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });

    var protocol = require('protocol');

    if (protocol.isHandledProtocol('https')) {
        protocol.interceptProtocol('https', function(request) {
          var url = request.url.substr(7)
          console.log(url);
          return;
        });
    } else {
        protocol.registerProtocol('https', function(request) {
          var url = request.url.substr(7)
          console.log('URL', url)
          return;
        });
    }

    loadURL();
}

function loadURL() {
    if (!mainWindow) return;
    if (!serverPort) return;
    mainWindow.loadUrl('http://localhost:'+serverPort);
}

