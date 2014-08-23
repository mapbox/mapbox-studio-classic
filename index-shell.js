var atom = require('app');
var path = require('path');
var spawn = require('child_process').spawn;
var BrowserWindow = require('browser-window');
var Menu = require('menu');
var shell = require('shell');
var versionCheck = require('./lib/version-check');

var node = path.resolve(path.join(__dirname, 'vendor', 'node'));
var script = path.resolve(path.join(__dirname, 'index-server.js'));

// Start the server child process.
var server = spawn(node, [script, '--shell=true']);
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
        'min-width': 720,
        'min-height': 480,
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
    // Prevent page changes from updating the window title (typically to 'Untitled').
    mainWindow.on('page-title-updated', function(e) {
        e.preventDefault();
    });

    createMenu();
    loadURL();
}

function loadURL() {
    if (!mainWindow) return;
    if (!serverPort) return;
    versionCheck({
        host: 'mapbox.s3.amazonaws.com',
        path: '/mapbox-studio/latest',
        pckge: require('./package.json')
    }, function(update, current, latest){
        update = update ? '/update?current='+current+'&latest='+latest : '';
        mainWindow.loadUrl('http://localhost:'+serverPort + update);
    });
}

function createMenu() {
    var template;

    if (process.platform == 'darwin') {
    template = [
      {
        label: 'Mapbox Studio',
        submenu: [
          {
            label: 'About Mapbox Studio',
            selector: 'orderFrontStandardAboutPanel:'
          },
          {
            type: 'separator'
          },
          {
            label: 'Hide Mapbox Studio',
            accelerator: 'Command+H',
            selector: 'hide:'
          },
          {
            label: 'Hide Others',
            accelerator: 'Command+Shift+H',
            selector: 'hideOtherApplications:'
          },
          {
            label: 'Show All',
            selector: 'unhideAllApplications:'
          },
          {
            type: 'separator'
          },
          {
            label: 'Quit Mapbox Studio',
            accelerator: 'Command+Q',
            selector: 'performClose:'
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          {
            label: 'Cut',
            accelerator: 'Command+X',
            selector: 'cut:'
          },
          {
            label: 'Copy',
            accelerator: 'Command+C',
            selector: 'copy:'
          },
          {
            label: 'Paste',
            accelerator: 'Command+V',
            selector: 'paste:'
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Reload',
            accelerator: 'Command+R',
            click: function() { mainWindow.restart(); }
          },
          {
            label: 'Toggle Developer Tools',
            accelerator: 'Alt+Command+I',
            click: function() { mainWindow.toggleDevTools(); }
          },
          {
            type: 'separator'
          },
          {
            label: 'Toggle Full Screen',
            accelerator: 'Ctrl+Command+F',
            click: function() { mainWindow.setFullScreen(!mainWindow.isFullScreen()); }
          }
        ]
      },
      {
        label: 'Window',
        submenu: [
          {
            label: 'Minimize',
            accelerator: 'Command+M',
            selector: 'performMiniaturize:'
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Online Resources',
            click: function() { shell.openExternal('https://www.mapbox.com/mapbox-studio/'); }
          }
        ]
      }
    ];

    menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}

