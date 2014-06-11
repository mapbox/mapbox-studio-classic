// Codemirror search for tm2
// ===========================
// - Combines dialog.js and search.js together
// - Dialog cleanup and uses mapbox.com/base class structure.
//
// Define search commands. Depends on dialog.js or another
// implementation of the openDialog method.

// Ctrl-G.
(function (mod) {
    mod(CodeMirror);
})(function (CodeMirror) {
    'use strict';

    function dialogDiv(cm, template) {
        var wrap = cm.getWrapperElement();

        var past = document.getElementById('dialog');
        if (past) past.parentNode.removeChild(past);

        var dialog;
        dialog = wrap.appendChild(document.createElement('div'));
        dialog.id = 'dialog';
        dialog.className = 'CodeMirror-dialog fill-white keyline-bottom pin-top z100';

        if (typeof template == 'string') {
            dialog.innerHTML = template;
        } else {
            // Assuming it's a detached DOM element.
            dialog.appendChild(template);
        }
        return dialog;
    }

    CodeMirror.defineExtension('openDialog', function (template, callback) {
        var dialog = dialogDiv(this, template);
        var inp = document.getElementsByClassName('js-search-input')[0],
            info = document.getElementsByClassName('js-cm-dialog-info')[0],
            exit = document.getElementsByClassName('js-cm-dialog-close')[0],
            button = document.getElementsByClassName('js-cm-search-button')[0],
            me = this;

        function close() {
            if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
            clearSearch(me);
        }

        CodeMirror.on(exit, 'click', function() {
            close();
        });

        CodeMirror.on(document, 'keydown', function(e) {
            if (e.keyCode === 27) close();
        });

        CodeMirror.on(inp, 'keydown', function(e) {
            if (e.keyCode === 13 || (e.keyCode === 71 && e.metaKey) || (e.keyCode === 70 && e.metaKey)) {
                inp.blur();
                CodeMirror.e_stop(e);
                me.focus();
                callback(inp.value);
            }
        });

        CodeMirror.on(button, 'click', function(e) {
            // if a search is already underway, button finds next
            if (me.state.search.query === inp.value) {
                findNext(me);
            } else {
                callback(inp.value);
            }
        });

        inp.focus();

        return close;
    });

    function searchOverlay(query, caseInsensitive) {
        var startChar;
        if (typeof query == 'string') {
            startChar = query.charAt(0);
            query = new RegExp('^' + query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'),
                caseInsensitive ? 'i' : '');
        } else {
            query = new RegExp('^(?:' + query.source + ')', query.ignoreCase ? 'i' : '');
        }
        return {
            token: function (stream) {
                if (stream.match(query)) return 'searching';
                while (!stream.eol()) {
                    stream.next();
                    if (startChar && !caseInsensitive)
                        stream.skipTo(startChar) || stream.skipToEnd();
                    if (stream.match(query, false)) break;
                }
            }
        };
    }

    function SearchState() {
        this.posFrom = this.posTo = this.query = null;
        this.overlay = null;
    }

    function getSearchState(cm) {
        return cm.state.search || (cm.state.search = new SearchState());
    }

    function queryCaseInsensitive(query) {
        return typeof query == 'string' && query == query.toLowerCase();
    }

    function getSearchCursor(cm, query, pos) {
        // Heuristic: if the query string is all lowercase, do a case insensitive search.
        return cm.getSearchCursor(query, pos, queryCaseInsensitive(query));
    }

    function dialog(cm, text, f) {
        cm.openDialog(text, f);
    }

    function parseQuery(query) {
        var isRE = query.match(/^\/(.*)\/([a-z]*)$/);
        if (isRE) {
            query = new RegExp(isRE[1], isRE[2].indexOf('i') == -1 ? '' : 'i');
            if (query.test('')) query = /x^/;
        } else if (query == '') {
            query = /x^/;
        }
        return query;
    }

    var infoText = '<div id="search-info" class="clearfix keyline-top small fill-white search-info hidden">'+
        '<div class="pad1 col6">'+
          '<div class="code"><kbd class="prefixed">F</kbd> Find</div>'+
          '<div class="code"><kbd class="prefixed">G</kbd> Next result</div>'+
        '</div>' +
        '<div class="pad1 col6">'+
          '<div class="quiet">use /re/ syntax for regex search.</div>'+
          '<div class="code"><kbd class="prefixed">Shift+G</kbd> Previous result</div>'+
        '</div>' +
    '</div>';
    var infoAndClose = "<a href='#search-info' class='js-cm-dialog-info pin-topleft pad1 inline icon info quiet dialog-n'></a><a href='#' class='js-cm-dialog-info pin-topleft pad1 inline icon info fill-darken2 dark dialog-y'></a><a href='#' id='js-cm-dialog-close' class='js-cm-dialog-close pin-right pad1 inline icon x quiet'></a></div>";
    var queryButton = "<div class='pin-topright pad0y'><a href='#' class='js-cm-search-button button short icon small quiet search'>Find</a></div>"
    var queryDialog = "<div class='fill-white z10 pad4x'><fieldset class='keyline-left contain'><input type='text' placeholder='Search stylesheet' value='' class='js-search-input clean stretch'>" + queryButton + "</fieldset></div>" + infoText + infoAndClose;

    function doSearch(cm, rev) {
        var state = getSearchState(cm);
        if (state.query) return findNext(cm, rev);
        dialog(cm, queryDialog, function (query) {
            cm.operation(function () {
                if (state.query && state.query !== query) state.query = query;
                state.query = parseQuery(query);
                cm.removeOverlay(state.overlay, queryCaseInsensitive(state.query));
                state.overlay = searchOverlay(state.query, queryCaseInsensitive(state.query));
                cm.addOverlay(state.overlay);
                state.posFrom = state.posTo = cm.getCursor();
                findNext(cm, rev);
            });
        });
    }

    function findNext(cm, rev) {
        cm.operation(function () {
            var state = getSearchState(cm);
            var cursor = getSearchCursor(cm, state.query, rev ? state.posFrom : state.posTo);
            if (!cursor.find(rev)) {
                cursor = getSearchCursor(cm, state.query, rev ? CodeMirror.Pos(cm.lastLine()) : CodeMirror.Pos(cm.firstLine(), 0));
                if (!cursor.find(rev)) return;
            }
            cm.setSelection(cursor.from(), cursor.to());
            cm.scrollIntoView({
                from: cursor.from(),
                to: cursor.to()
            });
            state.posFrom = cursor.from();
            state.posTo = cursor.to();
        });
    }

    function clearSearch(cm) {
        cm.operation(function () {
            var state = getSearchState(cm);
            if (!state.query) return;
            state.query = null;
            cm.removeOverlay(state.overlay);
        });
    }

    CodeMirror.commands.find = function (cm) {
        clearSearch(cm);
        doSearch(cm);
    };
    CodeMirror.commands.findNext = doSearch;
    CodeMirror.commands.findPrev = function (cm) {
        doSearch(cm, true);
    };
    CodeMirror.commands.clearSearch = clearSearch;
});
