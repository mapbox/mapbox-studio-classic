var _ = require('underscore');
var fs = require('fs');
var url = require('url');
var path = require('path');
var yaml = require('js-yaml');
var dirty = require('dirty');
var mapnik = require('mapnik');
var mkdirp = require('mkdirp');
var crypto = require('crypto');
var fstream = require('fstream');
var tilelive = require('tilelive');
var existsSync = require('fs').existsSync || require('path').existsSync;
var speedometer = require('speedometer');
var rotate = require('log-rotate');
var through = require('through');

tilelive.protocols['mbtiles:'] = require('mbtiles');

var tm = {};

// Set or get config.
tm.db;
tm._config = {
    db: path.join(process.env.HOME, '.mapbox-studio', 'app.db'),
    tmp: path.join(process.env.HOME, '.mapbox-studio', 'tmp'),
    log: path.join(process.env.HOME, '.mapbox-studio', 'app.log'),
    cache: path.join(process.env.HOME, '.mapbox-studio', 'cache'),
    fonts: path.join(process.env.HOME, '.mapbox-studio', 'fonts'),
    mapboxauth: 'https://api.mapbox.com',
    mapboxtile: 'https://a.tiles.mapbox.com/v4'
};
tm.config = function(opts, callback) {
    if (!opts) return tm._config;

    tm._config = _(opts).defaults(tm._config);
    // @TODO create other paths (cache, etc.)
    try {
        mkdirp.sync(path.dirname(tm.config().db));
        mkdirp.sync(tm.config().tmp);
        mkdirp.sync(tm.config().cache);
        mkdirp.sync(tm.config().fonts);
    } catch(err) { throw err; }

    // Register default fonts.
    mapnik.register_fonts(path.dirname(require.resolve('mapbox-studio-pro-fonts')), { recurse: true });
    mapnik.register_fonts(path.dirname(require.resolve('mapbox-studio-default-fonts')), { recurse: true });
    mapnik.register_fonts(tm.config().fonts, { recurse: true });

    // Register default plugins. Used for font rendering.
    mapnik.register_default_input_plugins();

    // Set up logging with rotation after 10e6 bytes.
    tm.applog(tm.config().log, 10e6, function(err) {
        if (err && callback) return callback(err);
        if (err) throw err;
        // Compact db.
        tm.dbcompact(tm.config().db, function(err, db) {
            if (err && callback) return callback(err);
            if (err) throw err;
            tm.dbmigrate(db);
            tm.db = db;
            if (callback) return callback();
        });
    });

    return tm._config;
};

// Run migrations on a node-dirty database.
tm.dbmigrate = function(db) {
    switch(db.get('version')) {
    case 3:
    case 2:
    case 1:
        db.set('version', 4);
        db.set('history', _(db.get('history')||{}).reduce(function(memo, list, type) {
            if (type !== 'style' && type !== 'source') return memo;
            list.forEach(function(id) {
                var uri = url.parse(id);
                if (uri.protocol === 'mapbox:' && uri.protocol.indexOf(':///') === -1) {
                    memo.push(!uri.pathname ? id.replace('://', ':///') : id);
                } else if (!uri.protocol) {
                    memo.push('tm' + type + '://' + uri.pathname);
                } else {
                    memo.push(id);
                }
            });
            return memo;
        }, []));
        break;
    case undefined:
        db.set('version', 4);
        break;
    }
};

// Compact a node-dirty database. Works by loading an old instance of the db,
// copying all docs into memory, deleting the old db and writing a new one
// in its place.
tm.dbcompact = function(filepath, callback) {
    var olddb = {};
    fs.exists(filepath, function(exists) {
        // If the db does not exist, no need to compact.
        return exists ? readold() : finish();
    });
    // Read the old db into memory.
    function readold() {
        var old = dirty(filepath);
        old.once('read_close', compact);
        old.once('load', function() {
            old.forEach(function(k,v) { olddb[k] = v; });
            old.close();
            if (!Object.keys(olddb).length) return finish();
        });
    }
    // Build compacted db from old docs.
    function compact() {
        var db = dirty(filepath + '.compacted');
        for (var k in olddb) db.set(k, olddb[k]);
        db.once('write_close', swap);
        db.once('drain', function() { db.close(); });
    }
    // Rename compacted db over old db.
    function swap() {
        fs.rename(filepath + '.compacted', filepath, function(err) {
            if (err) return callback(err);
            return finish();
        });
    }
    function finish() {
        var db = dirty(filepath);
        db.once('load', function() {
            return callback(null, db);
        });
    }
};

// Set up app logging to a file with rotation.
tm.applog = function(filepath, maxsize, callback) {
    if (!filepath) return callback();

    fs.stat(filepath, function(err, stat) {
        if (err && err.code !== 'ENOENT') return callback(err);
        if (stat && !stat.isFile()) return callback(new Error(filepath + ' is not a file'));
        if (!err && stat && stat.size > maxsize) {
            rotate(filepath, { compress: true }, function(err) {
                if (err) return callback(err);
                setup(0);
            });
        } else {
            setup(stat && stat.size || 0);
        }
    });

    function setup(offset) {
        var logstream = fs.createWriteStream(filepath, {
            flags: offset ? 'r+' : 'w',
            start: offset
        });
        var pipeout = through();
        var pipeerr = through();
        pipeout.pipe(logstream);
        pipeout.pipe(process.stdout);
        pipeerr.pipe(logstream);
        pipeerr.pipe(process.stderr);
        process.__defineGetter__('stdout', function() { return pipeout; });
        process.__defineGetter__('stderr', function() { return pipeerr; });
        return callback();
    }
};

// Set or remove a project id from recent history.
var defaultSources = [
    'mapbox:///mapbox.mapbox-streets-v5',
    'mapbox:///mapbox.mapbox-terrain-v1,mapbox.mapbox-streets-v5',
    'mapbox:///mapbox.satellite,mapbox.mapbox-streets-v5'
];
tm.history = function(id, invalidate) {
    var history = tm.db.get('history') || [];
    history = history.filter(function(k) { return defaultSources.indexOf(k) === -1 });

    // Add id to the end of history entries.
    if (id) {
        var uri = tm.parse(id);
        if (uri.protocol !== 'mapbox:' &&
            uri.protocol !== 'http:' &&
            uri.protocol !== 'https:' &&
            uri.protocol !== 'tmsource:' &&
            uri.protocol !== 'tmstyle:') {
            throw new Error('invalid id protocol ' + uri.protocol)
        }
        // Normalize id to uri.dirname for Windows paths.
        if (uri.protocol === 'tmsource:' || uri.protocol === 'tmstyle:') {
            id = uri.protocol + '//' + uri.dirname;
        }
        var update = history.filter(function(k) { return k !== id });
        if (!invalidate) update.push(id);
        if (update.join(',') !== history.join(',')) {
            history = update;
            tm.db.set('history', history);
        }
    }

    history = [].concat(defaultSources).concat(history);

    return history;
};

// Remotes cache.
var remote = {};
tm.remote = function(id, data) {
    if (!data) {
        return remote[id] || false;
    } else {
        remote[id] = data;
        return remote[id];
    }
};

// Load templates.
tm.templates = _(fs.readdirSync(__dirname + '/../templates')).reduce(function(memo, file) {
    if (file.charAt(0) === '.') return memo;
    memo[file.split('.')[0]] = _(fs.readFileSync(__dirname + '/../templates/' + file, 'utf8')).template();
    return memo;
}, {});

// Writes an array of files defined by { basename:[basename], data:[data] }
tm.writefiles = function(basepath, files, callback) {
    var write = function() {
        if (!files.length) return callback();
        var file = files.shift();
        fs.writeFile(path.join(basepath, file.basename), file.data, function(err) {
            if (err) return callback(err);
            write();
        });
    };
    mkdirp(basepath, function(err) {
        if (err) return callback(err);
        write();
    });
};

// Reads a directory of files.
tm.dirfiles = function(basepath, callback) {
    fs.readdir(path.resolve(basepath), function(err, files) {
        if (err) return callback(err);
        files = files.filter(function(f) { return f[0] !== '.' });

        var stats = [];
        var stat = function() {
            if (!files.length) {
                stats.sort(function(a,b) {
                    if (a.type < b.type) return -1;
                    if (a.type > b.type) return 1;
                    if (a.basename.toLowerCase() < b.basename.toLowerCase()) return -1;
                    if (a.basename.toLowerCase() > b.basename.toLowerCase()) return 1;
                    return 0;
                });
                return callback(null, stats);
            }
            var p = path.join(basepath, files.shift());
            fs.stat(p, function(err, s) {
                if (err && err.code === 'ENOENT') return stat();
                if (err && err.code === 'EBUSY') return stat();
                if (err && err.code === 'EPERM') return stat();
                if (err) return callback(err);
                if (s.isFile()) s.type = 'file';
                if (s.isDirectory()) s.type = 'dir';
                if (s.type) {
                    s.path = p;
                    s.extname = path.extname(p);
                    s.basename = path.basename(p);
                    stats.push(s);
                }
                stat();
            });
        };
        stat();
    });
};

// Filter keys out of an object that are not present in defaults.
tm.filterkeys = function(data, defaults) {
    return _(data).reduce(function(memo,v,k) {
        if (!(k in defaults)) return memo;
        memo[k] = v;
        return memo;
    }, {})
};

// Return an object with sorted keys, ignoring case.
tm.sortkeys = function(obj) {
    try {
        return obj.map(tm.sortkeys);
    } catch(e) {};
    try {
        return Object.keys(obj).sort(function(a, b) {
            a = a.toLowerCase();
            b = b.toLowerCase();
            if (a === 'id') return -1;
            if (b === 'id') return 1;
            if (a > b) return 1;
            if (a < b) return -1;
            return 0;
        }).reduce(function(memo, key) {
            memo[key] = tm.sortkeys(obj[key]);
            return memo;
        }, {});
    } catch(e) { return obj };
};

// Get current oauth credentials. Wrapper around tm.db.get('oauth')
// but to consolidate error handling around EOAUTH code.
tm.oauth = function() {
    var oauth = tm.db.get('oauth');
    if (!oauth || !oauth.account) {
        var err = new Error('No active OAuth account');
        err.code = 'EOAUTH';
        throw err;
    }
    return oauth;
};

// Generate a mapid using current active account name/credentials.
tm.mapid = function() {
    var oauth = tm.oauth();
    return oauth.account + '.' + crypto.createHash('md5')
        .update((+ new Date).toString())
        .digest('hex')
        .substr(0,8);
};

// Named projections.
tm.srs = {
    'WGS84': '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs',
    '900913': '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over'
};
tm.extent = {
    'WGS84': '-180,-85.0511,180,85.0511',
    '900913': '-20037508.34,-20037508.34,20037508.34,20037508.34'
};
// Reverse the above hash to allow for srs name lookups.
tm.srsname = {};
for (name in tm.srs) tm.srsname[tm.srs[name]] = name;

// Render a preview image for a font.
tm.font = function(name, text, callback) {
    tm.fonts = tm.fonts || mapnik.fonts();
    if (tm.fonts.indexOf(name) === -1) return callback(new Error('Invalid font ' + name));

    // Attempt to retrieve from cache.
    var xml = tm.templates.xrayfont({name:name, text:text||name});
    var ckey = 'font-' + crypto.createHash('md5').update(xml).digest('hex').substr(0,8) + '.png';
    var file = tm.config().cache + '/' + ckey;
    fs.readFile(file, function(err, buffer) {
        if (err && err.code !== 'ENOENT') return callback(err);
        if (buffer) {
            buffer.hit = true;
            return callback(null, buffer);
        }

        var map = new mapnik.Map(500,60);
        map.extent = [-180,-10,180,10];
        map.fromString(xml, function(err) {
            if (err) return callback(err);
            map.render(new mapnik.Image(500,60), {}, function(err, image) {
                if (err) return callback(err);
                image.encode('png8:m=h:c=64', function(err, buffer) {
                    if (err) return callback(err);

                    // Don't wait for disk write to return image buffer.
                    // If caching fails, error is logged to console.
                    callback(null, buffer);
                    fs.writeFile(file, buffer, function(err) {
                        if (err) console.error(err);
                    });
                });
            });
        });
    });
};

// Take list of fonts from mapnik and group by "family".
tm._fontfamilies = null;
tm.fontfamilies = function() {
    if (tm._fontfamilies) return tm._fontfamilies;

    var fonts = require('mapnik').fonts();
    // Keywords are ordered by "display priority" -- e.g. fonts
    // containing earlier words should be favored for being a preview
    // of the family as a whole.
    var keywords = [
        'medium',
        'normal',
        'regular',
        'book',
        'roman',
        'semibold',
        'demi',
        'bold',
        'caption',
        'cn',
        'cond',
        'condensed',
        'extended',
        'extrabold',
        'black',
        'heavy',
        'ultra',
        'light',
        'narrow',
        'thin',
        'extlight',
        'hairline',
        'italic',
        'oblique',
        'dash'
    ];
    var level1 = {};
    for (var i = 0; i < fonts.length; i++) {
        var parts = fonts[i].split(' ');
        while (parts.length) {
            var word = parts[parts.length-1];
            if (keywords.indexOf(word.toLowerCase()) === -1) break;
            parts.pop();
        }
        var family = parts.join(' ');
        level1[family] = level1[family] || [];
        level1[family].push(fonts[i]);
    }
    var level2 = {};
    for (var fam in level1) {
        if (level1[fam].length > 1) continue;

        var parts = fam.split(' ');
        if (parts.length === 1) continue;
        parts.pop();
        var family = parts.join(' ');

        level2[family] = level2[family] || [];
        level2[family].push(level1[fam][0]);
    }
    for (var fam in level1) {
        if (level1[fam].length > 1) continue;

        var parts = fam.split(' ');
        if (parts.length === 1) continue;
        parts.pop();
        var family = parts.join(' ');

        if (level2[family].length > 1) {
            delete level1[fam];
            level1[family] = level2[family];
        }
    }
    for (var k in level1) level1[k].sort(famsort);

    function famsort(a, b) {
        var ascore = 0;
        var bscore = 0;
        var aindex = -1;
        var bindex = -1;
        var aparts = a.split(' ');
        var bparts = b.split(' ');
        for (var i = 0; i < aparts.length; i++) {
            aindex = keywords.indexOf(aparts[i].toLowerCase());
            ascore += aindex >= 0 ? aindex : 0;
        }
        for (var i = 0; i < bparts.length; i++) {
            bindex = keywords.indexOf(bparts[i].toLowerCase());
            bscore += bindex >= 0 ? bindex : 0;
        }
        return ascore - bscore;
    }

    tm._fontfamilies = level1;
    return level1;
};

// Return an augmented uri object from url.parse with the pathname
// transformed into an unescaped dirname.
tm.parse = function(str) {
    var uri = url.parse(str);
    if (uri.pathname) {
        uri.dirname = unescape(uri.pathname);
        if (uri.host && uri.host.length === 1) {
            uri.dirname = uri.host + ':' + uri.dirname;
        }
        uri.dirname = tm.join(uri.dirname);
    }
    return uri;
};

// Normalize a path to use forward slashes. Primarily for sanity and
// test fixture comparison.
tm.join = function(str) {
    str = path.join.apply(path, arguments);
    str = str.split(path.sep).join('/');
    if ((/^[a-z]\:/i).test(str)) str = str[0].toLowerCase() + str.substr(1);
    return str;
};

// Return true/false depending on whether a path is absolute.
tm.absolute = function(str) {
    if (str.charAt(0) === '/') return true;
    if ((/^[a-z]\:/i).test(str)) return true;
    return false;
};

// Recursively copy a dir to another using fstream.
// Exclude should be an array of string or regex objects. Any matching
// filenames will be excluded from the copy.
tm.copydir = function(from, to, exclude, callback) {
    exclude = exclude || [ /^[\.\_]/ ];

    if (!Array.isArray(exclude)) return callback(new Error('exclude must be an array'));

    fs.exists(to, function(exists) {
        if (exists) {
            var err = new Error('Destination path "' + to + '" exists');
            err.code = 'EEXIST';
            return callback(err);
        }
        var once = false;
        var reader = fstream.Reader({
            path:from,
            type:'Directory',
            filter: function(info) {
                for (var i = 0; i < exclude.length; i++) {
                    if (typeof exclude[i] === 'string' && info.props.basename === exclude[i]) return false;
                    if (exclude[i] instanceof RegExp && exclude[i].test(info.props.basename)) return false;
                }
                return true;
            }
        });
        var writer = fstream.Writer({ path:to, type:'Directory'});
        reader.on('error', done);
        writer.on('error', done);
        writer.on('end', done);
        reader.pipe(writer);
        function done(err) {
            if (once) return;
            once = true;
            return callback(err);
        }
    });
};

module.exports = tm;
