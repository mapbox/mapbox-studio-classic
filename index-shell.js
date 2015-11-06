var atom = require('app');
var path = require('path');
var spawn = require('child_process').spawn;
var BrowserWindow = require('browser-window');
var Menu = require('menu');
var shell = require('shell');
var versionCheck = require('./lib/version-check');
var log = require('./lib/log');
var node = path.resolve(path.join(__dirname, 'vendor', 'node'));
var script = path.resolve(path.join(__dirname, 'index-server.js'));
var logger = require('fastlog')('', 'debug', '<${timestamp}>');
var server = null
var serverPort = null;
var mainWindow = null;

if (process.platform === 'win32') {
    // HOME is undefined on windows
    process.env.HOME = process.env.USERPROFILE;
}

atom.on('window-all-closed', exit);
atom.on('ready', makeWindow);

process.on('exit', function(code) {
    logger.debug('Mapbox Studio exited ' + (undefined === code ? 'normally' : 'with ' + code));
});

process.on('uncaughtException', function(err) {
    logger.debug('Hit unexpected JS Error in server, please report this entire log to https://github.com/mapbox/mapbox-studio-classic/issues');
    if (err) {
      logger.debug(err);
    } else {
      logger.debug('no error reported');
    }
});

function exit() {
    if (server){ server.kill() };
    //atom.quit(); //is the way to do it: https://github.com/atom/atom-shell/blob/master/docs/api/app.md#app
    if (atom.listeners('window-all-closed').length == 1){ atom.quit(); }
};


var shellLog = path.join(process.env.HOME, '.mapbox-studio', 'shell.log');
// set up shell.log and log rotation
log(shellLog, 10e6, shellsetup);

function shellsetup(err) {
    if(err) {
      console.log('shellsetup:', err);
      exit();
      return;
    }
    // Start the server child process.
    server = spawn(node, [script, '--shell=true'])
        .on('error', function(error) {
            process.stdout.write('error spawning server process: ' + error + '\n');
        })
        .on('exit', exit);
    if(!server.pid){
        process.stdout.write('server process has no pid\n');
    } else {
        process.stdout.write('server process pid: ' + server.pid + '\n');
        server.stdout.once('data', function(data) {
            var matches = data.toString().match(/Mapbox Studio @ http:\/\/localhost:([0-9]+)\//);
            if (!matches) {
                console.warn('Server port not found');
                process.exit(1);//?? atom.quit();
            }
            serverPort = matches[1];
            logger.debug('Mapbox Studio @ http://localhost:'+serverPort+'/');
            loadURL();
        });

        // Report crashes to our server.
        require('crash-reporter').start();
    }
};

function makeWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 960,
        height: 600,
        'min-width': 720,
        'min-height': 480,
        title: 'Mapbox Studio Classic',
        'node-integration': 'all',
        'web-preferences': {
            webgl: true,
            java: false,
            webaudio: false
        }
    });
    mainWindow.loadUrl('file://' + path.join(__dirname, 'app', 'loading.html'));
    // Restore OS X fullscreen state.
    restoreFullScreen();
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
    mainWindow.on('enter-full-screen', function(e) {
        persistFullScreen();
    });
    mainWindow.on('leave-full-screen', function(e) {
        persistFullScreen();
    });
    createMenu();
    loadURL();

    // Restore OS X fullscreen state.
    function restoreFullScreen() {
        if (process.platform !== 'darwin') return;
        var cp = require("child_process");
        if (cp.execSync("defaults read com.mapbox.mapbox-studio FullScreen 2>/dev/null || echo 0") == 1) {
            setTimeout(function(){
                mainWindow.setFullScreen(true);
            }, 100);
        }
    }

    // Persist OS X fullscreen state.
    function persistFullScreen() {
        if (process.platform !== 'darwin') return;
        var cp = require("child_process");
        cp.execSync("defaults write com.mapbox.mapbox-studio FullScreen -bool " + mainWindow.isFullScreen());
    }
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
          },
          {
            label: 'Select All',
            accelerator: 'Command+A',
            selector: 'selectAll:'
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
          },
          {
            label: 'Application Log',
            click: function() {
                var cp = require("child_process");
                cp.exec("open -a /Applications/Utilities/Console.app ~/.mapbox-studio/app.log");
            }
          },
          {
            label: 'Shell Log',
            click: function() {
                var cp = require("child_process");
                cp.exec("open -a /Applications/Utilities/Console.app ~/.mapbox-studio/shell.log");
            }
          }
        ]
      }
    ];

    menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}
