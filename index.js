#!/usr/bin/env node

var atom;
try { atom = require('app'); } catch(err) {}
if (atom) {
    require('./index-shell');
} else {
    require('./index-server');
}

