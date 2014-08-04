var atom = require('app');
var path = require('path');
var spawn = require('child_process').spawn;
var BrowserWindow = require('browser-window');
var Menu = require('menu');


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

    // var protocol = require('protocol');

    // if (protocol.isHandledProtocol('https')) {
    //     console.log('top', protocol.isHandledProtocol('https'))
    //     protocol.interceptProtocol('https', function(request) {
    //       console.log(req)
    //       var url = request.url.substr(7)
    //       console.log(url);
    //       return;
    //     });
    // } else {
    //     console.log('bottom')
    //     protocol.registerProtocol('https', function(request) {
    //       var url = request.url.substr(7)
    //       console.log('URL', url)
    //       return;
    //     });
    // }

    createMenu();
    loadURL();
}

function loadURL() {
    if (!mainWindow) return;
    if (!serverPort) return;
    mainWindow.loadUrl('http://localhost:'+serverPort);
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
            label: 'Quit',
            accelerator: 'Command+Q',
            click: function() { app.quit(); }
          },
        ]
      },
      {
        label: 'Edit',
        submenu: [
          {
            label: 'Undo',
            accelerator: 'Command+Z',
            selector: 'undo:'
          },
          {
            label: 'Redo',
            accelerator: 'Shift+Command+Z',
            selector: 'redo:'
          },
          {
            type: 'separator'
          },
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
          },
          {
            label: 'Select All',
            accelerator: 'Command+A',
            selector: 'selectAll:'
          },
          {
            type: 'separator'
          },
          {
            label: 'Save',
            accelerator: 'Command+S',
            selector: 'save:'
          },
          {
            type: 'separator'
          },
          {
            label: 'Find',
            accelerator: 'Command+F',
            selector: 'find:'
          },
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
            label: 'Enter Fullscreen',
            click: function() { mainWindow.setFullScreen(true); }
          },
          {
            label: 'Toggle DevTools',
            accelerator: 'Alt+Command+I',
            click: function() { mainWindow.toggleDevTools(); }
          },
        ]
      },
      {
        label: 'Window',
        submenu: [
          {
            label: 'Minimize',
            accelerator: 'Command+M',
            selector: 'performMiniaturize:'
          },
          {
            label: 'Close',
            accelerator: 'Command+W',
            selector: 'performClose:'
          },
        ]
      },
    ];

    menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } else {
    template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Open',
            accelerator: 'Ctrl+O',
          },
          {
            label: 'Close',
            accelerator: 'Ctrl+W',
            click: function() { mainWindow.close(); }
          },
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Reload',
            accelerator: 'Ctrl+R',
            click: function() { mainWindow.restart(); }
          },
          {
            label: 'Enter Fullscreen',
            click: function() { mainWindow.setFullScreen(true); }
          },
          {
            label: 'Toggle DevTools',
            accelerator: 'Alt+Ctrl+I',
            click: function() { mainWindow.toggleDevTools(); }
          },
        ]
      },
    ];
    menu = Menu.buildFromTemplate(template);
    mainWindow.setMenu(menu);
  }
}

