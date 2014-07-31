window.Style = function(templates, cwd, style) {

var map;
var tiles;
var xray;
var grids;
var gridc;
var mtime = (+new Date).toString(36);

statHandler('drawtime')();

if ('onbeforeunload' in window) window.onbeforeunload = function() {
  if ($('body').hasClass('changed')) return 'Save your changes?';
};

var Editor = Backbone.View.extend({});
var Modal = new views.Modal({
  el: $('.modal-content'),
  templates: templates
});

CodeMirror.keyMap.tabSpace = {
  Tab: function(cm) {
    var spaces = Array(cm.getOption('indentUnit') + 1).join(' ');
    cm.replaceSelection(spaces, 'end', '+input');
  },
  fallthrough: ['default']
};

var Tab = function(id, value) {
  var tab = CodeMirror(function(cm) {
    document.getElementById('stylesheets').appendChild(cm);
  }, {
    value: value,
    lineNumbers: true,
    paletteHints: true,
    gutters: ['CodeMirror-linenumbers', 'errors'],
    mode: {
      name: 'carto',
      reference: window.cartoRef
    },
    keyMap: 'tabSpace'
  });
  var completer = cartoCompletion(tab, window.cartoRef);

  /*
  @TODO
  function updateSelectors(model) {
      var ids = _.map(model.get('Layer').pluck('id'),
          function(x) { return '#' + x; });
      var classes = _(model.get('Layer').pluck('class')).chain().map(
          function(c) {
              if (c == undefined) return '';
              var cs = c.split(' ');
              if (cs[0] == '') return '';
              return _.map(cs, function(x) { return '.' + x; });
          }).flatten().compact().value();
      cartoCompleter.ids(ids);
      cartoCompleter.classes(classes);
  }
  this.model.bind('change', updateSelectors);
  updateSelectors(this.model);
  */

  tab.on('keydown', completer.onKeyEvent);
  tab.on('change', function() { return window.editor && window.editor.changed(); });
  tab.setOption('onHighlightComplete', _(completer.setTitles).throttle(100));
  tab.getWrapperElement().id = 'code-' + id.replace(/[^\w+]/g,'_');
  return tab;
};
var code = _(style.styles).reduce(function(memo, value, k) {
  memo[k] = Tab(k, value);
  return memo;
}, {});

_(code).toArray().shift().getWrapperElement().className += ' active';

var Style = Backbone.Model.extend({});
Style.prototype.url = function() { return '/style.json?id=' + this.get('id'); };

var Source = Backbone.Model.extend({});
Source.prototype.url = function() { return '/source.json?id=' + this.get('id'); };

Editor.prototype.events = {
  'click .js-browsestyle': 'browseStyle',
  'click .js-browsesource': 'browseSource',
  'click .js-tab': 'tabbed',
  'click .js-save': 'save',
  'click .js-saveas': 'saveModal',
  'click .js-recache': 'recache',
  'change #settings-drawer': 'changed',
  'submit #settings-drawer': 'save',
  'click .js-addtab': 'addtabModal',
  'submit #addtab': 'addtab',
  'submit #addmapbox': 'addmapbox',
  'click #tabs .js-deltab': 'deltab',
  'click .js-ref-delete': 'delstyle',
  'click .js-modalsources': 'modalsources',
  'click .js-adddata': 'adddata',
  'click .js-upload': 'upload',
  'click .js-selectall': 'selectall',
  'click .js-download': 'downloadPackage',
  'keydown': 'keys'
};

Editor.prototype.changed = function() {
  $('body').addClass('changed');
};

Editor.prototype.keys = function(ev) {
  // Escape. Collapses windows, dialogs, modals, etc.
  if (ev.which === 27) {
    if (Modal.active) Modal.close();
    window.location.href = '#';
  }
  if ((!ev.ctrlKey && !ev.metaKey) || ev.shiftKey) return;

  var which = ev.which;
  switch (true) {
  case (which === 83): // s
    this.save();
    break;
  case (which === 72): // h for help
    ev.preventDefault();
    this.togglePane('docs');
    break;
  case (which === 190): // . for fullscreen
    ev.preventDefault();
    this.togglePane('full');
    break;
  case (which === 73): // i for layers/data
    ev.preventDefault();
    this.togglePane('layers');
    break;
  case (which === 220): // \ for settings
    ev.preventDefault();
    this.togglePane('settings');
    break;
  case (which === 66): // b for bookmarks
    ev.preventDefault();
    this.togglePane('bookmark');
    break;
  case ((which > 48 && which < 58) && ev.altKey): // 1-9 + alt
    var tab = $('#tabs a.tab')[(which-48)-1];
    if (tab) $(tab).click();
    break;
  default:
    return true;
  }
  return false;
};
Editor.prototype.saveModal = function() {
  Modal.show('browsersave', {type:'style', cwd:cwd});
  new views.Browser({
    el: $('.modal-content #saveas'),
    filter: function(file) { return file.type === 'dir' && !(/\.tm2$/).test(file.basename); },
    callback: function(err, filepath) {
      if (err) return false; // @TODO
      filepath = filepath.replace(/\.tm2/,'') + '.tm2';
      var id = 'tmstyle://' + filepath;
      window.editor.model.set({id:id});
      window.editor.save(null, {
        success: function() { window.location = '/style?id=' + id; },
        error: _(window.editor.error).bind(window.editor)
      });
      return false;
    }
  });
  return false;
};
Editor.prototype.browseSource = views.Browser.sourceHandler(Modal, cwd);
Editor.prototype.browseStyle = views.Browser.styleHandler(Modal, cwd);
Editor.prototype.togglePane = function(name) {
  var loc = location.href;
  if (loc.indexOf('#'+name) === -1) {
    location.href = loc.substring(0, loc.indexOf('#'))+'#'+name;
  } else {
    location.href = loc.replace('#'+name, '#');
  }
};

Editor.prototype.messageclear = function() {
  messageClear();
  _(code).each(function(cm) {
      _(cm._cartoErrors||[]).each(function() {
        cm.clearGutter('errors');
      });
    delete cm._cartoErrors;
  });
};

Editor.prototype.delstyle = delStyle;
Editor.prototype.tabbed = tabbedHandler;

Editor.prototype.modalsources = function(ev) {
  var style = this.model.attributes;
  $.ajax({
    url: '/history.json',
    success: function(history) {
      Modal.show('sources', {
        style: style,
        history: history
      });
    }
  });
  return false;
};
Editor.prototype.adddata = function(ev) {
  var target = $(ev.currentTarget);
  var id = target.attr('href').split('?id=').pop();
  (new Source({id:id})).fetch({
    success: _(function(model, resp) {
      $('.js-layers .js-layer-content').html(templates.sourcelayers(resp));
      this.model.set({source:id});
      this.changed();
      Modal.close();
    }).bind(this),
    error: _(this.error).bind(this)
  });
  return false;
};
Editor.prototype.addmapbox = function(ev) {
  var attr = _($('#addmapbox').serializeArray()).reduce(function(memo, field) {
    memo[field.name] = field.value;
    return memo;
  }, {});
  var id = attr.id;
  if (!(/^(https?:\/\/)|(mapbox:\/\/)/).test(id)) {
    id = 'mapbox:///' + id;
  }
  (new Source({id:id})).fetch({
    success: _(function(model, resp) {
      $('.js-layers .js-layer-content').html(templates.sourcelayers(resp));
      this.model.set({source:id});
      this.changed();
      Modal.close();
    }).bind(this),
    error: _(this.error).bind(this)
  });
  return false;
};
Editor.prototype.addtabModal = function() {
  Modal.show('addtab');
  return false;
};
Editor.prototype.addtab = function(ev) {
  var field = $('.js-addtab-filename');
  var filename = field.val().replace(/.mss/,'') + '.mss';
  if (!code[filename]) {
    $('.carto-tabs').append("<a rel='"+filename+"' href='#code-"+filename.replace(/[^\w+]/g,'_')+"' class='keyline-right strong quiet tab js-tab pad1y pad0x truncate'>"+filename.replace(/.mss/,'')+" <span class='icon trash js-deltab pin-topright pad0'></span></a><!--");
    code[filename] = Tab(filename, '');
    this.changed();
  } else {
    Modal.show('error', 'Tab name must be different than existing tab "' + filename.replace(/.mss/,'') + '"');
    field.val('');
    return false;
  }
  field.val('');
  Modal.close();
  return false;
};
Editor.prototype.deltab = function(ev) {
  var styles = this.model.get('styles');
  var parent = $(ev.currentTarget).parent();
  var target = parent.attr('rel');
  if (!styles[target] || confirm('Remove stylesheet "' + target.replace(/.mss/,'') + '"?')) {
    $(code[target].getWrapperElement()).remove();
    parent.remove();
    delete styles[target];
    delete code[target];
    this.model.set({styles:styles});
    this.changed();
  }

  // Set first tab to active.
  var tabs = $('.js-tab', '#tabs');
  if (parent.is('.active') && tabs.size())
    this.tabbed({ currentTarget:tabs.get(tabs.length - 1) });

  return false;
};
Editor.prototype.recache = function(ev) {
  this.model.set({_recache:true});
  this.save(ev);
  return false;
};
Editor.prototype.save = function(ev, options) {
  var editor = this;

  // Set map in loading state.
  $('#full').addClass('loading');

  // Clear focus from any fields.
  $('#settings-drawer input, #settings-drawer textarea').blur();

  var attr = {};
  // Grab settings form values.
  _($('#settings-drawer').serializeArray()).reduce(function(memo, field) {
    if (field.name === 'minzoom' || field.name === 'maxzoom') {
      memo[field.name] = parseInt(field.value,10);
    } else if (field.name && field.value) {
      memo[field.name] = field.value;
    }
    return memo;
  }, attr);
  // Grab styles, sources.
  attr.styles = _(code).reduce(function(memo, cm, k) {
    memo[k] = cm.getValue();
    return memo;
  }, {});
  attr.source = $('.js-layers .js-layer').map(function() {
    return $(this).attr('id').split('layer-').pop();
  }).get().shift();

  if (this.model.get('_prefs').saveCenter) {
    var zoom = Math.min(Math.max(map.getZoom(),attr.minzoom),attr.maxzoom);
    var lon = map.getCenter().lng % 360;
    lon += (lon < -180) ? 360 : (lon > 180) ? -360 : 0;
    attr.center = [lon , map.getCenter().lat, zoom];
  }

  // New mtime querystring
  mtime = (+new Date).toString(36);

  options = options || {
    success:_(this.refresh).bind(this),
    error: _(this.error).bind(this)
  };
  this.model.save(attr, options);

  return ev && !!$(ev.currentTarget).is('a');
};
Editor.prototype.error = function(model, resp) {
  this.messageclear();

  if (!resp.responseText)
    return Modal.show('error', 'Could not save style "' + model.id + '"');

    // Assume carto.js specific error array format response.
  _(JSON.parse(resp.responseText).message.toString().split('\n')).chain()
    .compact()
    .map(function(e) { return e.match(/^(Error: )?([\w.]+):([\d]+):([\d]+) (.*)$/) || e; })
    .each(_(function(e) {
      if (_(e).isArray()) {
        var id = e[2];
        var ln = parseInt(e[3]) - 1;
        code[id]._cartoErrors = code[id]._cartoErrors || [];
        code[id]._cartoErrors.push(ln);
        code[id].setGutterMarker(ln, 'errors', this.cartoError(ln, e));
      } else {
        return Modal.show('error', e);
      }
    }).bind(this));
};

Editor.prototype.cartoError = function(ln, e) {
    var error = document.createElement('div');
    error.className = 'error';

    var link = document.createElement('a');
    link.id = 'error-' + ln;
    link.href = '#error-' + ln;

    var message = document.createElement('small');
    message.className = 'js-message message round-right pad0y pad1x z10';
    message.innerHTML = e[5];

    var close = document.createElement('a');
    close.className = 'icon x pin-right quiet pad0';
    close.href = '#';

    message.appendChild(close);
    error.appendChild(link);
    error.appendChild(message);
    return error;
};

Editor.prototype.upload = function(ev) {
  var style = this.model.get('id');
  $('#mapstatus').addClass('loading');
  $.ajax({
    url: '/style.upload.json?id=' + style,
    method: 'PUT'
  })
    .done(function(info) {
      $('.js-mapid').text(info._prefs.mapid);
      $('#mapstatus').removeClass('loading');
      $('#mapstatus').addClass('uploaded');
      setTimeout(function() { $('#mapstatus').removeClass('uploaded'); }, 1000);
      return true;
    })
    .error(function(resp) {
      $('#mapstatus').removeClass('loading');
      return Modal.show((resp.status === 422 ? 'upgrade' : 'error'), resp.responseText);
    });
};

Editor.prototype.downloadPackage = function(ev){
  if (style.source.split(':')[0] === 'tmsource'){
    return Modal.show('error', new Error('Cannot package a local source with a style.'));
  } else {
    window.location = '/style.tm2z?id=' + style.id;
  }
};

Editor.prototype.selectall = function(ev) {
  $(ev.currentTarget).select();
  return false;
};

Editor.prototype.refresh = function(ev) {
  this.messageclear();
  $('body').removeClass('changed');

  if (!map) {
    map = L.mapbox.map('map');
    map.setView([this.model.get('center')[1], this.model.get('center')[0]], this.model.get('center')[2]);
    map.on('zoomend', function() { $('#zoomedto').attr('class', 'contain z' + (map.getZoom()|0)); });
    map.on('click', inspectFeature({
      id: this.model.id,
      type: 'style',
      map: map
    }));
    new views.Maputils({
      el: $('#view'),
      map: map,
      model: this.model
    });
  }
  map.options.minZoom = this.model.get('minzoom');
  map.options.maxZoom = this.model.get('maxzoom');

  // Refresh map layer.
  if (tiles) map.removeLayer(tiles);
  tiles = L.mapbox.tileLayer({
    tiles: ['/style/{z}/{x}/{y}.png?id=' + this.model.id + '&' + mtime ],
    minzoom: this.model.get('minzoom'),
    maxzoom: this.model.get('maxzoom')
  })
  .on('tileload', statHandler('drawtime'))
  .on('load', errorHandler);
  if (window.location.hash !== '#xray') {
    $('.xray-toggle').removeClass('active');
    tiles.addTo(map);
  }

  // Refresh xray layer.
  if (xray) map.removeLayer(xray);
  xray = L.mapbox.tileLayer({
    tiles: ['/source/{z}/{x}/{y}.png?id=' + this.model.get('source') + '&' + mtime ],
    minzoom: this.model.get('minzoom'),
    maxzoom: this.model.get('maxzoom')
  });
  if (window.location.hash === '#xray') {
    $('.xray-toggle').addClass('active');
    xray.addTo(map);
  }

  // Refresh gridcontrol template.
  if (grids) map.removeLayer(grids);
  if (gridc) map.removeControl(gridc);
  if (this.model.get('template') && this.model.get('interactivity_layer')) {
    grids = L.mapbox.gridLayer({
      grids: ['/style/{z}/{x}/{y}.grid.json?id=' + this.model.id + '&' + mtime ],
      minzoom: this.model.get('minzoom'),
      maxzoom: 22
    });
    gridc = L.mapbox.gridControl(grids, {
      follow: true,
      template: this.model.get('template')
    });
    map.addLayer(grids);
    map.addControl(gridc);
  }

  // Refresh map title.tm.db.rm('user');
  $('title, .js-name').text(this.model.get('name') || 'Untitled');
  $('.proj-active .style-name').text(this.model.get('name') || 'Untitled');

  // Set canvas background color.
  if (xray && window.location.hash === '#xray') {
    $('#map').css({'background-color':'#222'});
  } else if (this.model.get('background')) {
    $('#map').css({'background-color':this.model.get('background')});
  }

  return false;
};

window.editor = new Editor({
  el: document.body,
  model: new Style(style)
});
window.editor.refresh();

// A few :target events need supplemental JS action. Handled here.
window.onhashchange = function(ev) {
  analytics.page({hash:window.location.hash});

  switch (ev.newURL.split('#').pop()) {
  case 'demo':
    $('body').addClass('demo');
    window.editor.refresh();
    break;
  case 'start':
    $('body').removeClass('demo');
    window.editor.refresh();
    setTimeout(map.invalidateSize, 200);
    localStorage.setItem('style.demo', true);
    break;
  case 'home':
  case 'xray':
    window.editor.refresh();
    break;
  }
};

// Enter walkthrough if not yet set.
if (!localStorage.getItem('style.demo')) window.location.hash = '#demo';

window.onhashchange({
  oldURL:window.location.toString(),
  newURL:window.location.toString()
});

// Syntax highlighting for carto ref.
$('pre.carto-snippet').each(function(i, elem) {
  var text = $(elem).text();
  $(elem).empty();
  CodeMirror.runMode(text, {name:'carto',reference:window.cartoRef}, $(elem).get(0));
});

};
