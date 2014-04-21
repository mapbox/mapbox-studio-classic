var _ = require('underscore');
var path = require('path');
var source = require('../lib/source');
var style = require('../lib/style');
var tm = require('../lib/tm');

var defaults = {};
style.info('tmstyle://' + path.dirname(require.resolve('tm2-default-style')), function(err, info) {
    if (err) throw err;
    var data = JSON.parse(JSON.stringify(info));
    delete data.id;
    defaults.style = data;
});

var middleware = {};

middleware.history = function(req, res, next) {
    req.history = {};
    var history = tm.history();
    var types = Object.keys(history);

    if (!types.length) return next();

    var load = function(type, queue) {
        if (!queue.length && !types.length) return next();
        if (!queue.length) {
            type = types.shift();
            queue = history[type].slice(0);
            return load(type, queue);
        }
        var id = queue.shift();
        var method = type === 'style' ? style.info : source.info;
        method(id, function(err, info) {
            if (err) {
                tm.history(type, id, true);
            } else {
                req.history[type] = req.history[type] || {};
                req.history[type][id] = info;
            }
            load(type, queue);
        });
    };
    var type = types.shift();
    var queue = history[type].slice(0);
    load(type, queue);
}

middleware.loadStyle = function(req, res, next) {
    var id = req.query.id;
    var tmp = id && style.tmpid(id);
    var data = false;
    var done = function(err, s) {
        if (err) return next(err);
        if (!tmp) tm.history('style', id);
        req.style = s;
        return next();
    };
    if (req.method === 'PUT') {
        // Save a new style and return it
        style.save(req.body, done);
    } else if (tmp && req.path === '/style') {
        // create a tmp style
        style.save(_({id:id}).defaults(defaults.style), done);
    } else {
        // get an existing style
        style(id, done);
    }
};

module.exports = middleware;