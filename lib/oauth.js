var passport = require('passport');
var express = require('express');
var util = require('util');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var tm = require('./tm');
var middleware = require('./middleware');
var request = require('request');
var nocache = Math.random().toString(36).substr(-8);
var http = require('http');

// Add passport OAuth2 authorization.
util.inherits(Strategy, OAuth2Strategy);
function Strategy() {
    if (!tm.config().port) throw new Error('oauth requires known local port');

    OAuth2Strategy.call(this, {
        authorizationURL: tm.config().MapboxAuth + '/oauth/authorize',
        tokenURL:         tm.config().MapboxAuth + '/oauth/access_token',
        clientID:         'd8e0abd43fdbafe43c4fdc6059039595bd95518c4982050662d94c134c5538ea',
        clientSecret:     'aa13e1d37afdd2889a237386f2ee3c06e68c19f5b219a7477acd462c10f36af8',
        callbackURL:      'http://localhost:'+tm.config().port+'/oauth/mapbox'
    },
    function(accessToken, refreshToken, profile, callback) {
        profile.accessToken = accessToken;
        profile.refreshToken = refreshToken;
        return callback(null, profile);
    });
    this.name = 'mapbox';
    return this;
};
Strategy.prototype.userProfile = function(accessToken, done) {
    this._oauth2.get(tm.config().MapboxAuth + '/v1/user', accessToken, function (err, body) {
        // oauth2 lib seems to not handle errors in a way where
        // we can catch and handle them effectively. We attach them
        // to the profile object here for our own custom handling.
        if (err) {
            return done(null, { error:err });
        } else {
            return done(null, JSON.parse(body));
        }
    });
};
passport.use(new Strategy());
passport.serializeUser(function(obj, done) { done(null, obj); });
passport.deserializeUser(function(obj, done) { done(null, obj); });

var app = express();
app.use(passport.initialize());
app.use('/authorize', middleware.examples);
app.use('/authorize', function(req, res) {
    var latest = req.latest && (req.history.style[req.latest] || req.history.source[req.latest]);
    res.send(tm.templates.oauth({
        nocache: nocache,
        user: tm.db.get('user'),
        oauth: tm.db.get('oauth'),
        examples: req.examples,
        error: false
    }));
});
app.use('/unauthorize', function(req, res) {
    tm.db.rm('oauth');
    tm.db.rm('user');
    res.redirect('/authorize');
});
app.use('/oauth/mapbox', function(req, res, next) {
    if (req.query.error === 'access_denied') {
        tm.db.rm('oauth');
        tm.db.rm('user');
        next(new Error('Access denied'));
    } else if (req.query.error === 'fail') {
        tm.db.rm('oauth');
        tm.db.rm('user');
        next(new Error('Authorization failed'));
    } else {
        next();
    }
});
app.use('/oauth/mapbox', passport.authenticate('mapbox', {
    session: false,
    failureRedirect: '/oauth/mapbox?error=fail'
}));
app.use('/oauth/mapbox', function(req, res, next) {
    // The user ID is *required* here. If it is not provided
    // (see error "handling" or lack thereof in Strategy#userProfile)
    // we basically treat it as an error condition.
    if (!req.user.id || !req.user.accessToken) {
        tm.db.rm('oauth');
        tm.db.rm('user');
        return next(new Error('Authorization failed'));
    }

    request(tm._config.MapboxAuth+'/api/User/'+req.user.id+'?access_token='+req.user.accessToken, function(error, response, body) {
        var user;
        try {
            user = JSON.parse(body);
        } catch(err) {
            return next(new Error('Failed to parse user object'));
        }
        if (user.id !== req.user.id) {
            return next(new Error('Failed to get user object'));
        }

        tm.db.set('oauth', {
            account: req.user.id,
            accesstoken: req.user.accessToken
        });
        tm.db.set('user', user);

        res.set({'content-type':'text/html'});
        res.redirect('/authorize');
    });
});

app.use('/oauth/atlas', function(req, res, next) {
    if (req.query.error === 'not_found') {
        tm.db.rm('oauth');
        tm.db.rm('user');
        next(new Error('Cannot find Mapbox Atlas'));
    } else if (req.query.error === 'fail') {
        tm.db.rm('oauth');
        tm.db.rm('user');
        next(new Error('Authorization failed'));
    } else {
        next();
    }
});

app.use('/oauth/atlas', function(req, res, next){
    // There needs to be a better way to pass in the location of the Atlas Server
    // right now it's just an environment variable
    http.get(process.env.MapboxTile + '/atlas/config', function(response){
        response.setEncoding('utf8');
        response.on('data', function(data){
            if (data.replace(/^\s+|\s+$/g, '') == 'Not Found'){
                res.redirect('/oauth/atlas?error=not_found');
            } else {
                tm.db.set('oauth', {
                    account: 'Atlas',
                    accesstoken: 'AtlasToken'
                });
                tm.db.set('user', {id: 'AtlasUser'});
                tm._config.MapboxTile = JSON.parse(data).tileHost + '/v4',
                res.redirect('/authorize');
            }
        });
    }).on('error', function(e){
        res.redirect('/oauth/atlas?error=not_found');
    });
});

//app.use('/:oauth(oauth)/mapbox/fail', function(req, res) {
//    tm.db.rm('oauth');
//    next(new Error('Authorization failed'));
//});
// Log internal OAuth errors to the console and respond with the usual
// response body to end OAuth iframe authorization process.
app.use(function(err, req, res, next) {
    if (err.name !== 'InternalOAuthError') return next(err);
    console.error(err);
    res.redirect('/authorize');
});

module.exports = app;
