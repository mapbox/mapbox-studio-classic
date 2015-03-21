// Stopgap atom.js file for handling normal browser things that atom
// does not yet have stable from the browser-side API.
// - Opening external links in default web browser
// - Saving files/downloads to disk
$(document).ready(function() {
    if (typeof process === 'undefined') return;
    if (typeof process.versions['atom-shell'] === undefined) return;

    var remote = require('remote');
    var shell = require('shell');
    var url = require('url');
    var path = require('path');

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

        // Passthrough for all other extensions.
        if (!typeLabel) return undefined;

        // HOME is undefined on windows
        if (process.platform === 'win32') process.env.HOME = process.env.USERPROFILE;

        var fs = remote.require('fs');
        var http = remote.require('http');
        var dialog = remote.require('dialog');

        // Show save dialog and make a GET request, piping
        // the response into the specified filePath.
        var defaultPath = path.join(process.env.HOME,'Untitled ' + typeLabel + '.' + typeExtension);
        var filePath = dialog.showSaveDialog({
            title: 'Save ' + typeLabel,
            defaultPath: defaultPath,
            filters: [{ name: typeExtension.toUpperCase(), extensions: [typeExtension]}]
        });

        if (!filePath) return false;

        window.Modal.show('atomexporting');

        function error(err) {
            window.Modal.close();
            window.Modal.show('error', err);
        }

        function finish() {
            window.Modal.close();
            window.Modal.show('atomcomplete');
        }

        http.get(uri, function(res) {
            if (res.statusCode !== 200) return error(new Error('Got HTTP code ' + res.statusCode));
            try {
                var writeStream = fs.createWriteStream(filePath);
            } catch(err) {
                return error(err);
            }
            res.on('error', error);
            writeStream.on('error', error);
            res.pipe(writeStream).on('finish', finish);
        }).on('error', error);

        return false;
    });

    if (window.Modal) {
        window.Modal.options.templates.modalatomexporting = function() {
            return "\
            <div id='atom-loading' class='modal-body contain round col6 space-bottom4 dark fill-dark'>\
                <h3 class='center pad1y pad2x keyline-bottom'>Exporting</h3>\
                <div class='row2 loading contain'></div>\
            </div>";
        };
        window.Modal.options.templates.modalatomcomplete = function() {
            return "\
            <div id='atom-loading' class='modal-body contain round col6 space-bottom4 dark fill-dark'>\
                <h3 class='center pad1y pad2x keyline-bottom'>Exporting</h3>\
                <div class='row2 pad2 contain clearfix'>\
                    <a href='#' class='js-close margin3 col6 button icon check'>Export complete</a>\
                </div>\
            </div>";
        };
    }
});
