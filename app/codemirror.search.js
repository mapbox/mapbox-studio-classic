// Replace works a little oddly -- it will do the replace on the next
// Ctrl-G (or whatever is bound to findNext) press. You prevent a
// replace by making sure the match is no longer selected when hitting
// Ctrl-G.

(function() {

  var wrap;
  function dialogDiv(cm, template) {
    wrap = cm.getWrapperElement();
    wrap.style.bottom = '40px'; // offset search dialog height
    var dialog;
    dialog = document.getElementById('code').appendChild(document.createElement('div'));
    dialog.className = 'search-dialog pin-bottom col12 clearfix';
    dialog.innerHTML = template;
    return dialog;
  }

  function close() {
    if (wrap) wrap.style.bottom = 0;
    $('.search-dialog').remove();
  }

  function newDialog(cm, template, callback) {
    var dialog = dialogDiv(cm, template),
        me = cm,
        inp = dialog.getElementsByTagName('input')[0],
        selection = cm.getSelection();
    if (selection) inp.value = selection;
    if (inp) {
      CodeMirror.connect(inp, 'keydown', function(e) {
        if (e.keyCode == 13) {
          CodeMirror.e_stop(e);
          clearSearch(me);
          me.focus();
          callback(inp.value);
        } else if (e.keyCode == 27) {
          CodeMirror.e_stop(e);
          close();
          me.focus();
        }
      });
      inp.focus();
    }
    dialog.querySelector('.icon.x').addEventListener('click', function() {
      clearSearch(me);
      me.focus();
      close();
    });
    dialog.querySelector('.icon.help').addEventListener('click', function() {
      this.parentNode.removeChild(this);
      wrap.style.bottom = '115px';
      dialog.querySelector('.search-help').classList.remove('hidden');
      return false;
    });
    window.addEventListener('keydown', function(e) {
      if (e.which == 27) {
        clearSearch(cm);
        close();
      }
    });

    return close;
  };

  var helpText = '<div class="clearfix keyline-top small fill-darken0 search-help hidden">'+
    '<div class="pad1">Use /re/ syntax for regex search</div>'+
    '<div class="keyline-top pad1 keyline-right col6">'+
      '<span class="code inline"> <kbd>Cmd</kbd><kbd>F</kbd> Find</span><br/>'+
      '<span class="code inline"><kbd>Cmd</kbd><kbd>G</kbd> Next</span> '+
    '</div>' +
    '<div class="keyline-top pad1 col6">'+
      '<span class="code inline"><kbd>Shift</kbd><kbd>Cmd</kbd>+<kbd>G</kbd> Prev</span><br/>'+
      '<span class="code inline"><kbd>Cmd</kbd>+<kbd>Alt</kbd>+<kbd>F</kbd> Find & Replace All</span>'+
    '</div>' +
    '</div>';

  function SearchState() {
    this.posFrom = this.posTo = this.query = null;
    this.marked = [];
  }
  function getSearchState(cm) {
    return cm._searchState || (cm._searchState = new SearchState());
  }
  function getSearchCursor(cm, query, pos) {
    return cm.getSearchCursor(query, pos, typeof query == "string" && query == query.toLowerCase());
  }
  function dialog(cm, text, f) {
    close();
    clearSearch(cm);
    newDialog(cm, text, f);
  }
  function parseQuery(query) {
    var isRE = query.match(/^\/(.*)\/([a-z]*)$/);
    return isRE ? new RegExp(isRE[1], isRE[2].indexOf("i") == -1 ? "" : "i") : query;
  }
  var queryDialog = '<fieldset class="search-dialog with-icon keyline-top">'+
    '<span class="icon search quiet"></span><input type="text" placeholder="Find" class="clean stretch" />'+
    '<div class="pin-topright pad1y"><a href="#" class="quiet icon help pad0x"></a><a href="#" class="quiet icon x pad1x"></a></div>'+
    '</fieldset>'+helpText;
  function doSearch(cm, rev) {
    var state = getSearchState(cm);
    if (state.query) return findNext(cm, rev);
    dialog(cm, queryDialog, function(query) {
      cm.operation(function() {
        if (!query || state.query) return;
        state.query = parseQuery(query);
        if (cm.lineCount() < 2000) { // This is too expensive on big documents.
          for (var cursor = getSearchCursor(cm, state.query); cursor.findNext();)
            state.marked.push(cm.markText(cursor.from(), cursor.to(), "CodeMirror-searching"));
        }
        state.posFrom = state.posTo = cm.getCursor();
        findNext(cm, rev);
      });
    });
  }
  function findNext(cm, rev) {cm.operation(function() {
    var state = getSearchState(cm);
    var cursor = getSearchCursor(cm, state.query, rev ? state.posFrom : state.posTo);
    if (!cursor.find(rev)) {
      cursor = getSearchCursor(cm, state.query, rev ? {line: cm.lineCount() - 1} : {line: 0, ch: 0});
      if (!cursor.find(rev)) return;
    }
    cm.setSelection(cursor.from(), cursor.to());
    state.posFrom = cursor.from(); state.posTo = cursor.to();
  });}
  function clearSearch(cm) {cm.operation(function() {
    var state = getSearchState(cm);
    if (!state.query) return;
    state.query = null;
    for (var i = 0; i < state.marked.length; ++i) state.marked[i].clear();
    state.marked.length = 0;
  });}

  var replaceQueryDialog ='<fieldset class="search-dialog with-icon keyline-top">'+
    '<label for="search-find" class="col2 icon refresh quiet pad1 small">Find: </label><input type="text" id="search-find" class="clean col10" />'+
    '<div class="pin-topright pad1y"><a href="#" class="quiet icon help pad0x"></a><a href="#" class="quiet icon x pad1x"></a></div>'+
    '</fieldset>'+helpText;
  var replacementQueryDialog = '<fieldset class="search-dialog with-icon keyline-top">'+
    '<label for="search-find" class="col3 icon refresh quiet pad1 small truncate">Replace with: </label><input type="text" id="search-replace-with" class="clean col9" />'+
    '<div class="pin-topright pad1y"><a href="#" class="quiet icon help pad0x"></a><a href="#" class="quiet icon x pad1x"></a></div>'+
    '</fieldset>'+helpText;
  function replace(cm) {
    dialog(cm, replaceQueryDialog, function(query) {
      if (!query) return;
      query = parseQuery(query);
      dialog(cm, replacementQueryDialog, function(text) {
        function advance(cursor) {
          var start = cursor.from(), match;
          if (!(match = cursor.findNext())) {
            cursor = getSearchCursor(cm, query);
            if (!(match = cursor.findNext()) ||
                (start && cursor.from().line == start.line && cursor.from().ch == start.ch)) return;
          }
          cm.setSelection(cursor.from(), cursor.to());
        }
        function doReplace(cursor, match) {
          cursor.replace(typeof query == "string" ? text :
                         text.replace(/\$(\d)/, function(w, i) {return match[i];}));
          advance(cursor);
        }
        cm.compoundChange(function() { cm.operation(function() {
          for (var cursor = getSearchCursor(cm, query); cursor.findNext();) {
            if (typeof query != "string") {
              var match = cm.getRange(cursor.from(), cursor.to()).match(query);
              cursor.replace(text.replace(/\$(\d)/, function(w, i) {return match[i];}));
            } else cursor.replace(text);
          }
          close();
        });});
      });
    });
  }

  CodeMirror.commands.find = function(cm) {clearSearch(cm); doSearch(cm);};
  CodeMirror.commands.findNext = doSearch;
  CodeMirror.commands.findPrev = function(cm) {doSearch(cm, true);};
  CodeMirror.commands.clearSearch = clearSearch;
  CodeMirror.commands.replace = replace;
  CodeMirror.commands.replaceAll = replace;
})();