// Stopgap atom.js file for handling normal browser things that atom
// does not yet have stable from the browser-side API.
// - Opening external links in default web browser
// - Saving files/downloads to disk
$(document).ready(function() {
    if (typeof process === 'undefined') return;
    if (typeof process.versions['atom-shell'] === undefined) return;

    var remote = require('remote');
    var shell = require('shell');
    var http = require('http');
    var url = require('url');
    var fs = require('fs');

    $('body').on('click', 'a', function(ev) {
        var uri = url.parse(ev.currentTarget.href);

        // Opening external URLs.
        if (uri.hostname && uri.hostname !== 'localhost') {
            shell.openExternal(ev.currentTarget.href);
            return false;
        }

        // File saving.
        var fileTypes = {
            tm2z: 'Package',
            mbtiles: 'Tiles',
            png: 'Image',
            jpg: 'Image',
            jpeg: 'Image'
        }
        var typeExtension = (uri.pathname || '').split('.').pop().toLowerCase();
        var typeLabel = fileTypes[typeExtension];
        if (typeLabel) {
            var filePath = remote.require('dialog').showSaveDialog({
                title: 'Save ' + typeLabel,
                defaultPath: '~/Untitled ' + typeLabel + '.' + typeExtension,
                filters: [{ name: typeExtension.toUpperCase(), extensions: [typeExtension]}]
            });
            if (filePath) {
                window.Modal.show('atomexporting');
                uri.method = 'GET';
                var writeStream = fs.createWriteStream(filePath);
                var req = http.request(uri, function(res) {
                    if (res.statusCode !== 200) return;
                    res.pipe(writeStream);
                    writeStream.on('finish', function() {
                        window.Modal.close();
                    });
                });
                req.end();
            }
            return false;
        }
        // Passthrough everything else.
    });

    if (window.Modal) {
        window.Modal.options.templates.modalatomexporting = function() {
            return "\
            <div id='atom-loading' class='modal-body contain round col6 space-bottom4 dark fill-dark'>\
                <h3 class='center pad1y pad2x keyline-bottom'>Exporting</h3>\
                <div class='row2 loading contain'></div>\
            </div>";
        };
    }
});
