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
    makeWindow();
});
server.stdout.pipe(process.stdout);
server.stderr.pipe(process.stderr);

var serverPort = null;
var mainWindow = null;

// Report crashes to our server.
require('crash-reporter').start();

atom.on('window-all-closed', function() { atom.quit(); });
atom.on('ready', makeWindow);

function makeWindow() {
    if (!serverPort) return;

    // Create the browser window.
    mainWindow = new BrowserWindow({width: 800, height: 600});

    // and load the index.html of the app.
    mainWindow.loadUrl('http://localhost:'+serverPort);

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
}

