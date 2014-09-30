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

    CodeMirror.defineExtension('openDialog', function (callback) {
        var dialog = document.getElementsByClassName('CodeMirror-dialog')[0],
            inp = document.getElementsByClassName('js-search-input')[0],
            exit = document.getElementsByClassName('js-cm-dialog-close')[0],
            buttonWrap = document.getElementsByClassName('js-search-buttons')[0],
            button = document.getElementsByClassName('js-cm-search-button')[0],
            reset = document.getElementsByClassName('js-cm-reset-button')[0],
            me = this,
            state = getSearchState(me);


        if (!dialog.classList.contains('active')) {
            dialog.classList.add('active');
        }

        function close() {
            dialog.classList.remove('active');
            clearSearch(me);
            inp.blur();
        }

        function fail() {
            buttonWrap.classList.add('reset');
        }

        function search() {
            callback(inp.value);
            if (state.overlay.count) {
                buttonWrap.classList.remove('reset');
                me.focus();
            } else {
                fail();
            }
        }

        function searchReset() {
            clearSearch(me);
            inp.value = '';
            inp.focus();
            buttonWrap.classList.remove('reset');
        }

        CodeMirror.on(exit, 'click', function() {
            close();
        });

        CodeMirror.on(document, 'keydown', function(e) {
            if (e.keyCode === 27) close(); // esc
        });

        CodeMirror.on(inp, 'keydown', function(e) {
            if (e.keyCode === 13 || (e.keyCode === 71 && e.metaKey) || (e.keyCode === 70 && e.metaKey)) {
                search();
            }
        });

        CodeMirror.on(button, 'click', function(e) {
            search();
        });

        CodeMirror.on(reset, 'click', function(e) {
            searchReset();
        });

        inp.focus();

        return close;
    });

    function searchOverlay(query, caseInsensitive) {
        var count = 0;

        var startChar;
        if (typeof query == 'string') {
            startChar = query.charAt(0);
            query = new RegExp('^' + query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'),
                caseInsensitive ? 'i' : '');
        } else {
            query = new RegExp('^(?:' + query.source + ')', query.ignoreCase ? 'i' : '');
        }

        var token = function (stream) {
            if (stream.match(query)) {
                count = count + 1;
                this.count = count
                return 'searching';
            }
            while (!stream.eol()) {
                stream.next();
                if (startChar && !caseInsensitive)
                    stream.skipTo(startChar) || stream.skipToEnd();
                if (stream.match(query, false)) {
                    break;
                }
            }
        };

        return {
            token: token
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

    function doSearch(cm, rev) {
        var state = getSearchState(cm);
        if (state.query) return findNext(cm, rev);
        cm.openDialog(function (query) {
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
