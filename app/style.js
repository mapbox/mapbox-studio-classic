
window.Style = function(templates, cwd, style, examples) {

var map;
var tiles;
var xray;
var grids;
var gridc;
var mtime = (+new Date).toString(36);
var mapTemplate = '<div lat="<%= center[0] %>" lng="<%= center[1] %>" zoom="<%=zoom %>" id="gazetteer-map-<%= index %>" class="js-gazetteer-map col4 entry animate"><div class="z1 entry-label fill-darken1 dark pin-bottom center pin-top"><h2 class="pin-top pad2x"><%= place_name %></h2></div></div>';

function buildMap(container, lat, lng, zoom, view) {
  var tiles = L.mapbox.tileLayer({
    tiles: ['/style/{z}/{x}/{y}.png?id=' + view.model.id + '&' + mtime ],
    minzoom: view.model.get('minzoom'),
    maxzoom: view.model.get('maxzoom')
  });
  var map = L.mapbox.map(container);
  map.dragging.disable();
  map.touchZoom.disable();
  map.doubleClickZoom.disable();
  map.scrollWheelZoom.disable();
  map.setView([lat, lng], zoom);
  tiles.addTo(map);
};


statHandler('drawtime')();

if ('onbeforeunload' in window) window.onbeforeunload = function() {
  if ($('body').hasClass('changed')) return 'Save your changes?';
};

var Editor = Backbone.View.extend({});
var Modal = window.Modal = new views.Modal({
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
  'click .js-newstyle': 'newStyle',
  'click .js-browsestyle': 'browseStyle',
  'click .js-browsesource': 'browseSource',
  'click .js-tab': 'tabbed',
  'click .js-save': 'save',
  'click .js-gazetteer': 'gazetteer',
  'click .js-gazetteer-map': 'gazetteerJump',
  'click .js-show-search': 'showGazetteerSearch',
  'click .js-gazetteer-search': 'gazetteerSearch',
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
  'click .js-demo': 'demo',
  'keydown': 'keys',
  'click #bookmarks':'getbookmarks'
};

Editor.prototype.getbookmarks = function(ev) {
    var view = this;
  $('#gazetteerlist').html('bookmarkshere');
  var filtered=JSON.parse(localStorage.listofbookmarks);
  console.log(filtered);
  var mapTemplate = '<div lat="<%= center["lat"] %>" lng="<%= center["lng"] %>" zoom="<%=zoom %>" id="gazetteer-map-<%= index %>" class="fill-blue js-gazetteer-map row6 col3 entry animate"><span class="truncate fill-darken3 dark pad1 pin-bottom strong"><%= place_name %></span></div>';

    // Print template
    $('#gazetteerlist').html(_.map(filtered, function(d, i) {
      d.index = i;
      return _.template(mapTemplate, d);
    }));

    // Render maps
    _.each($('.js-gazetteer-map'), function(d) {
      var $this = $(d);
      var id = $this.attr('id');
      var lat = $this.attr('lat');
      var lng = $this.attr('lng');
      var zoom = $this.attr('zoom');
      console.log('id is '+id);
      buildMap(id, lat, lng, zoom);
    });

    function buildMap(container,lat,lng,zoom) {
      var tiles = L.mapbox.tileLayer({
        tiles: ['/style/{z}/{x}/{y}.png?id=' + view.model.id + '&' + mtime ],
        minzoom: view.model.get('minzoom'),
        maxzoom: view.model.get('maxzoom')
      });
      var map = L.mapbox.map(container);
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.setView([lat, lng], zoom);
      tiles.addTo(map);
    };


    var entry_string=localStorage.getItem(this.model.get('id') + '.bookmarks');
    var entries=JSON.parse(entry_string);
    for (var b in entry_string) {
    }
}

Editor.prototype.gazetteer = function(ev) {

  var target = $(ev.currentTarget);

  if ($(ev.currentTarget).hasClass('js-initialize-gazetteer') && $('.js-gazetteer-list').children().size() > 0) return;
  var view = this;
  var container = $('.js-gazetteer-toggle');
  var filter = $('input:checked',container).attr('value');

  $.getJSON('../ext/gazetteer.json', function(data) {

    // Filter data
    var filtered = _.filter(data, function(d) {

      return d.tags.indexOf(filter) !== -1;
    });

    // Print template
    $('#gazetteerlist').html(_.map(filtered, function(d, i) {
      d.index = i;
      return _.template(mapTemplate, d);
    }));

    // Render maps
    _.each($('.js-gazetteer-map'), function(d) {
      var $this = $(d);
      var id = $this.attr('id');
      var lat = $this.attr('lat');
      var lng = $this.attr('lng');
      var zoom = $this.attr('zoom');
      buildMap(id, lat, lng, zoom, view);
    });

  })
};

Editor.prototype.gazetteer = function(ev) {

  var target = $(ev.currentTarget);

  if ($(ev.currentTarget).hasClass('js-initialize-gazetteer') && $('.js-gazetteer-list').children().size() > 0) return;
  var view = this;
  var container = $('.js-gazetteer-toggle');
  var filter = $('input:checked',container).attr('value');

  $.getJSON('../ext/gazetteer.json', function(data) {

    // Filter data
    var filtered = _.filter(data, function(d) {
      return d.tags.indexOf(filter) !== -1;
    });

    // Print template
    $('#gazetteerlist').html(_.map(filtered, function(d, i) {
      d.index = i;
      return _.template(mapTemplate, d);
    }));

    // Render maps
    _.each($('.js-gazetteer-map'), function(d) {
      var $this = $(d);
      var id = $this.attr('id');
      var lat = $this.attr('lat');
      var lng = $this.attr('lng');
      var zoom = $this.attr('zoom');
      buildMap(id, lat, lng, zoom, view);
    });

  })
};

Editor.prototype.gazetteerJump = function(ev) {
  var target = $(ev.currentTarget);
  var lat = target.attr('lat');
  var lng = target.attr('lng');
  var zoom = target.attr('zoom');
  map.setView([lat, lng], zoom);
  window.location.href = '#';
};

Editor.prototype.showGazetteerSearch = function(ev) {
  var target = $(ev.currentTarget);
  if (target.hasClass('js-show')) {
    $('.js-gazetteer-container').removeClass('hidden');
    $('#gazetteer-search').focus();
  } else {
    $('.js-gazetteer-container').addClass('hidden');
    var container = $('.js-gazetteer-toggle');
    var filter = $('input:checked',container);
    window.editor.gazetteer(filter);
  }
  return false;
}

Editor.prototype.gazetteerSearch = function(ev) {
  var target = $(ev.currentTarget);

  var view = this;
  var filter = $('#gazetteer-search').val();

  console.log(filter);

  $.getJSON('../ext/gazetteer.json', function(data) {

    // Filter data
    var filtered = _.filter(data, function(d) {
      return d.tags.indexOf(filter) !== -1;
    });

    // Print template
    $('#gazetteerlist').html(_.map(filtered, function(d, i) {
      d.index = i;
      return _.template(mapTemplate, d);
    }));

    // Render maps
    _.each($('.js-gazetteer-map'), function(d) {
      var $this = $(d);
      var id = $this.attr('id');
      var lat = $this.attr('lat');
      var lng = $this.attr('lng');
      var zoom = $this.attr('zoom');
      buildMap(id, lat, lng, zoom, view);
    });

  })
  return false;
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
    case (which === 69): // e for export-pane
    ev.preventDefault();
    this.togglePane('export');
    break;
  case ((which > 48 && which < 58) && ev.altKey): // 1-9 + alt
    var tab = $('#tabs a.tab')[(which-48)-1];
    if (tab) $(tab).click();
    break;
  case (which === 80): // p for places
    ev.preventDefault();
    this.togglePane('gazetteer');
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
Editor.prototype.newStyle = function() { return Modal.show('newstyle', examples) || false; };
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
  var view = this;
  var styles = this.model.get('styles');
  var parent = $(ev.currentTarget).parent();
  var target = parent.attr('rel');
  Modal.show('confirm', 'Remove stylesheet "' + target.replace(/.mss/,'') + '"?', function(err, confirm) {
    if (err) return Modal.show('error', err);
    if (!confirm) return;
    $(code[target].getWrapperElement()).remove();
    parent.remove();
    delete styles[target];
    delete code[target];
    view.model.set({styles:styles});
    view.changed();

    // Set first tab to active.
    var tabs = $('.js-tab', '#tabs');
    if (parent.is('.active') && tabs.size()) {
      view.tabbed({ currentTarget:tabs.get(tabs.length - 1) });
    }
  });
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
  $('#full').removeClass('loading');

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

Editor.prototype.selectall = function(ev) {
  $(ev.currentTarget).select();
  return false;
};

Editor.prototype.demo = function(ev) {
  $('body').toggleClass('demo');
};

Editor.prototype.refresh = function(ev) {
  this.messageclear();
  $('#full').removeClass('loading');
  $('body').removeClass('changed');

  if (!map) {
    map = L.mapbox.map('map');
    map.setView([this.model.get('center')[1], this.model.get('center')[0]], this.model.get('center')[2]);
    map.on('zoomend', function() { $('#zoomedto').attr('class', 'contain z' + (map.getZoom()|0)); });
    $('#map-center').text([this.model.get('center')[1].toFixed(4) + ', ' + this.model.get('center')[0].toFixed(4)]);
    map.on('moveend', function(e) {
        $('#map-center').text(map.getCenter().lat.toFixed(4) + ', ' + map.getCenter().lng.toFixed(4));
    });
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

  // Refresh gazetteer.
  if (window.location.hash === '#gazetteer') {
    var container = $('.js-gazetteer-toggle');
    var filter = $('input:checked',container);
    window.editor.showGazetteerSearch(filter);
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

var Printer = window.Print({
  style: Style,
  source: Source,
  map: map,
  tiles: tiles
});

window.exporter = new Printer({
  el: document.body,
  model: new Style(style)
});

// A few :target events need supplemental JS action. Handled here.
window.onhashchange = function(ev) {
  analytics.page({hash:window.location.hash});

  switch (ev.newURL.split('#').pop()) {
  case 'home':
  case 'xray':
    window.editor.refresh();
    break;
  case !'export':
    window.exporter.boundingBox.disable();
    $('.export-controls').addClass('visible-n').removeClass('visible-y');
    statHandler('drawtime')();
    break;
  case 'export':
    if ($('body').hasClass('local')) {
      window.location.hash = '#';
      break;
    }
    window.exporter.refresh();
    $('.export-controls').addClass('visible-y').removeClass('visible-n');
    break;
  default:
    if (window.exporter.boundingBox) {
      window.exporter.boundingBox.disable();
      $('.export-controls').addClass('visible-n').removeClass('visible-y');
      $('#zoomedto').addClass('visible-n').removeClass('visible-y');
      statHandler('drawtime')();
    }
    break;
  }
};

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
