window.Style = function(templates, style) {

var map;
var baselayer;
var tiles;
var xray;
var grids;
var gridc;
var templateEditor;
var mtime = (+new Date).toString(36);

statHandler('drawtime')();

if ('onbeforeunload' in window) window.onbeforeunload = function() {
  if (Editor && Editor.changed) return 'Save your changes?';
};

var Editor = Backbone.View.extend({});
var Modal = new views.Modal({ el: $('.modal-content') });

var Tab = function(id, value) {
  var tab = CodeMirror(function(cm) {
    document.getElementById('code')
      .insertBefore(cm, document.getElementById('interactivity'));
  }, {
    value: value,
    lineNumbers: true,
    paletteHints: true,
    gutters: ['CodeMirror-linenumbers', 'errors'],
    mode: {
      name: 'carto',
      reference: window.cartoRef
    }
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

  function changed() {
    Editor.changed = true;
  }

  if (id === 'template') templateEditor = tab;
  tab.on('keydown', completer.onKeyEvent);
  tab.on('change', changed);
  tab.setOption('onHighlightComplete', _(completer.setTitles).throttle(100));
  tab.getWrapperElement().id = 'code-' + id.replace(/[^\w+]/g,'_');
  return tab;
};
var code = _(style.styles).reduce(function(memo, value, k) {
  memo[k] = Tab(k, value);
  return memo;
}, {});

// Add in interactivity template. 
code.template = Tab('template', style.template);

_(code).toArray().shift().getWrapperElement().className += ' active';

var Style = Backbone.Model.extend({});
Style.prototype.url = function() { return '/style.json?id=' + this.get('id'); };

var Source = Backbone.Model.extend({});
Source.prototype.url = function() { return '/source.json?id=' + this.get('id'); };

Editor.prototype.events = {
  'click .saveas': 'saveModal',
  'click .browsestyle': 'browseStyle',
  'click .browsesource': 'browseSource',
  'click .js-save': 'save',
  'click .js-recache': 'recache',
  'submit #settings': 'save',
  'click .js-addtab': 'addtabModal',
  'submit #addtab': 'addtab',
  'click .js-addmapbox': 'addmapboxModal',
  'submit #addmapbox': 'addmapbox',
  'submit #bookmark': 'addbookmark',
  'submit #search': 'search',
  'click #tabs .js-deltab': 'deltab',
  'click #tabs .js-tab': 'tabbed',
  'click #docs .js-docs-nav': 'scrollto',
  'click #docs .js-tab': 'tabbed',
  'click #history .js-tab': 'tabbed',
  'click #history .js-ref-delete': 'delstyle',
  'click #settings .js-tab': 'tabbed',
  'click #layers .js-tab': 'tabbed',
  'click .js-modalsources': 'modalsources',
  'click .js-adddata': 'adddata',
  'click #zoom-in': 'zoomin',
  'click #zoom-out': 'zoomout',
  'click #bookmark .bookmark-name': 'gotoBookmark',
  'click #bookmark .js-del-bookmark': 'removebookmark',
  'click .bookmark-n': 'focusBookmark',
  'click #baselayer': 'toggleBaselayer',
  'click #xray': 'toggleXray',
  'click .js-info': 'toggleInfo',
  'click .js-expandall': 'expandall',
  'click .search-result': 'selectSearch',
  'click .search-result-bookmark': 'bookmarkSearch',
  'click .search-n': 'focusSearch',
  'click #upload-style': 'upload',
  'change .js-layer-options': 'populateInteractiveVals',
  'keydown': 'keys'
};

Editor.prototype.keys = function(ev) {
  // Escape. Collapses windows, dialogs, modals, etc.
  if (ev.which === 27) {
    if (Modal.active) Modal.close();
    window.location.href = '#';
  }
  if ((ev.which === 38 || ev.which == 40) && window.location.hash == '#search') {
    // up and down on search results
    ev.preventDefault();
    this.navSearch(ev, (ev.which === 38 ? 1 : -1));
    return;
  }
  if ((!ev.ctrlKey && !ev.metaKey) || ev.shiftKey) return;
  var which = ev.which;
  switch (true) {
  case (which === 83): // s
    this.save();
    break;
  case (which === 187): // +
    map.zoomBy(1);
    break;
  case (which === 189): // -
    map.zoomBy(-1);
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
    var tab = $('#tabs a.tab')[which-48];
    if (tab) tab.click();
    break;
  default:
    return true;
  }
  return false;
};
Editor.prototype.saveModal = function() {
  Modal.show('saveas');
  new views.Browser({
    el: $('.modal-content #saveas'),
    filter: function(file) { return file.type === 'dir' && !(/\.tm2$/).test(file.basename); },
    callback: function(err, filepath) {
      if (err) return false; // @TODO
      filepath = filepath.split(' ').join('_');
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
Editor.prototype.browseStyle = function() {
  Modal.show('browsestyle');
  new views.Browser({
    el: $('.modal-content #browsestyle'),
    filter: function(file) { return file.type === 'dir' || /\.tm2$/.test(file.basename); },
    isFile: function(file) { return /\.tm2$/.test(file); },
    callback: function(err, filepath) {
      if (err) return false; // @TODO
      filepath = filepath.split(' ').join('_');
      filepath = filepath.replace(/\.tm2/, '') + '.tm2';
      window.location = '/style?id=tmstyle://' + filepath;
      return false;
    }
  });
  return false;
};
Editor.prototype.browseSource = function() {
  Modal.show('browsesource');
  new views.Browser({
    el: $('.modal-content #browsesource'),
    filter: function(file) { return file.type === 'dir' || /\.tm2$/.test(file.basename); },
    isFile: function(file) { return /\.tm2$/.test(file); },
    callback: function(err, filepath) {
      if (err) return false; // @TODO
      filepath = filepath.split(' ').join('_');
      filepath = filepath.replace(/\.tm2/, '') + '.tm2';
      window.location = '/source?id=tmsource://' + filepath;
      return false;
    }
  });
  return false;
};
Editor.prototype.simpleModal = function(ev) {
  // for modals that just need to be shown, no callbacks/options
  var modalid = $(ev.currentTarget).data('modal');
  if (modalid) Modal.show(modalid);
  return false;
};
Editor.prototype.zoomin = function(out) {
  map.setZoom(map.getZoom()+1);
  return false;
};
Editor.prototype.zoomout = function() {
  map.setZoom(map.getZoom()-1);
  return false;
};
Editor.prototype.scrollto = function(ev) {
    id = $(ev.currentTarget).attr('href').split('#').pop();
    document.getElementById(id).scrollIntoView();
    return false;
};
Editor.prototype.togglePane = function(name) {
  var loc = location.href;
  if (loc.indexOf('#'+name) === -1) {
    location.href = loc.substring(0, loc.indexOf('#'))+'#'+name;
  } else {
    location.href = loc.replace('#'+name, '#');
  }
};
Editor.prototype.toggleInfo = function(ev) {
  var $el = $(ev.currentTarget);
  if ($el.is('.fill-darken2')) {
    $el.removeClass('fill-darken2 dark').addClass('quiet');
    $($el.attr('href')).addClass('hidden');
  } else {
    $el.addClass('fill-darken2 dark').removeClass('quiet');
    $($el.attr('href')).removeClass('hidden');
  }
  return false;
};
Editor.prototype.expandall = function(ev) {
  button = $(ev.currentTarget);

  if ( button.hasClass('expanded') ) {
    $('.carto-ref').removeClass('active');
    button.removeClass('expanded');
  } else {
    $('.carto-ref').addClass('active');
    button.addClass('expanded');
  }
  return false;
};
Editor.prototype.populateInteractiveVals = function(ev) {
  var layerName = $(ev.currentTarget).val();
  $('.js-layer-option[rel=' + layerName + ']')
    .removeClass('hidden')
    .siblings('.js-layer-option')
    .addClass('hidden');
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

Editor.prototype.messagemodal = function(text, html) {
  if (html) {
    $('.message-modal-body').html(html);
  } else {
    $('.message-modal-body').text(text);
  }
  if (Modal.active) Modal.close();
  Modal.show('message-modal');
};
Editor.prototype.addmapboxModal = function() {
  Modal.show('addmapbox');
  return false;
};
Editor.prototype.delstyle = delStyle;
Editor.prototype.tabbed = tabbedHandler;
Editor.prototype.addmapbox = addMapBox;

Editor.prototype.appendBookmark = function(name) {
  $('<li class="keyline-top contain">'+
    '<a href="#" class="icon marker quiet pad0 col12 small truncate bookmark-name">'+name+'</a>'+
    '<a href="#" class="icon keyline-left trash js-del-bookmark quiet pin-topright pad0" title="Delete"></a>'+
    '</li>').appendTo('#bookmark-list');
};
Editor.prototype.gotoBookmark = function(ev) {
  var target = $(ev.currentTarget),
      coords = this.bookmarks[target.text()];
  map.setView([coords[0], coords[1]], coords[2]);
  return false;
};
Editor.prototype.removebookmark = function(ev) {
  ev.preventDefault();
  var target = $(ev.currentTarget).prev('a'),
      name = target.text();
  target.parent('li').remove();
  if (this.bookmarks[name]) delete this.bookmarks[name];
  localStorage.setItem(this.model.get('id') + '.bookmarks', JSON.stringify(this.bookmarks));
  return false;
};
Editor.prototype.addbookmark = function(ev) {
  ev.preventDefault();
  var coords = map.getCenter(),
      zoom = map.getZoom(),
      field = $('#addbookmark'),
      fieldVal = field.val(),
      value = [coords.lat, coords.lng, zoom],
      name = fieldVal ? fieldVal : value;
  this.bookmarks[name] = value;
  localStorage.setItem(this.model.get('id') + '.bookmarks', JSON.stringify(this.bookmarks));
  field.val('');
  this.appendBookmark(name);
  return false;
};
Editor.prototype.focusBookmark = function(ev) {
  $('#addbookmark').focus();
  return;
};
Editor.prototype.toggleBaselayer = function(ev) {
  $(ev.currentTarget).toggleClass('active dark fill-dark fill-white quiet');
  this.refresh();
  return false;
};
Editor.prototype.toggleXray = function(ev) {
  $(ev.currentTarget).toggleClass('active dark fill-dark fill-white quiet');
  this.refresh();
  return false;
};
Editor.prototype.search = function(ev) {
  ev.preventDefault();
  var query = $('#search input').get(0).value;
  // This query is empty or only whitespace.
  if (/^\s*$/.test(query)) return null;

  // This query is too short. Wait for more input chars.
  if (query.length < 3) return;

  // The query matches what is currently displayed
  if ($('#search input').val() == $('#dosearch').data('query')) return;

  var $results = $('#search-results');
  $results.html('');

  var latlon = (function(q) {
      var parts = sexagesimal.pair(q);
      if (parts) return { lat: parts[0], lon: parts[1] };
  })(query);

  if (latlon) {
    // just go there, no search
    map.setView([latlon.lat, latlon.lon]);
    return false;
  }

  $.ajax('/geocode?search=' + query).done(function(data) {
    var results = (data && data.results) ? data.results : [];
    if (!results.length) {
      $results.html('<li class="keyline-top contain pad0 col12 small">No results</li>');
    }
    $('#dosearch').data('query', query);
    results.forEach(function(result, idx) {
      var coords = result[0].lat + ',' + result[0].lon;
      var place = _(result.slice(1)).chain().filter(function(v) { return v.type !== 'zipcode'; }).pluck('name').value().join(', ');
      $('<li class="keyline-top contain">'+
        '<a href="#" class="pad0 quiet small search-result truncate col12 align-middle'+(!idx ? 'active fill-white': '')+'" data-coords="'+coords+'" data-type="'+result[0].type+'" data-bounds="'+(result[0].bounds||false)+'" data-idx="'+idx+'">'+
        '<strong>'+result[0].name+'</strong><span class="small pad1x">'+place+'</span>'+
        '</a>'+
        '<a href="#bookmark" class="pad0 icon marker search-result-bookmark pin-topright quiet center keyline-left" title="Bookmark"></a>'+
        '</li>').appendTo($results);
      selectSearch(false, $('#search-results [data-idx="0"]'));
    });
  });
  return false;
};
Editor.prototype.selectSearch = selectSearch = function(ev, selection) {
  var data;
  if (ev) {
    ev.preventDefault();
    selection = ev.currentTarget;
    data = ev.currentTarget.dataset;
  } else {
    data = selection[0].dataset;
  }
  $('#search-results a.active').removeClass('active fill-white');
  $(selection).addClass('active fill-white');
  if (data.bounds !== 'false') {
    var bounds = data.bounds.split(',');
    map.fitBounds([[bounds[1],bounds[0]], [bounds[3],bounds[2]]]);
  } else {
    var coords = data.coords.split(',');
    if (data.type === 'address') {
      map.setView(coords, Math.max(16, map.getZoom()));
    } else if (data.type === 'street') {
      map.setView(coords, Math.max(15, map.getZoom()));
    } else {
      map.setView(coords);
    }
  }
  return false;
};
Editor.prototype.bookmarkSearch = function(ev, selection) {
  var result = $(ev.currentTarget).siblings('.search-result');
  selectSearch(false, result);
  $('#addbookmark').val(result.find('strong').text()+', '+result.find('span').text());
  $('#bookmark').submit();
};
Editor.prototype.navSearch = function(ev, dir) {
  var results = $('#search-results li');
  var active = results.find('.active')[0].dataset;
  var wanted = 0;
  if (dir === 1) {
    if (+active.idx - 1 < 0){
      wanted = results.length - 1;
    } else {
      wanted = +active.idx - 1;
    }
  } else {
    if (+active.idx + 1 > results.length - 1) {
      wanted = 0;
    } else {
      wanted = +active.idx + 1;
    }
  }
  this.selectSearch(false, $('#search-results [data-idx="'+wanted+'"]'));
  return false;
};
Editor.prototype.focusSearch = function(ev) {
  $('#dosearch').focus();
  return;
};
Editor.prototype.modalsources = function(ev) {
  Modal.show('modalsources');
  return false;
};
Editor.prototype.adddata = function(ev) {
  var target = $(ev.currentTarget);
  var id = target.attr('href').split('?id=').pop();
  (new Source({id:id})).fetch({
    success: _(function(model, resp) {
      $('#modalsources a.proj-active').removeClass('proj-active');
      $('#layers .js-menu-content').html(templates.sourcelayers(resp));
      console.warn(target);
      target.addClass('proj-active');
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
  var field = $('#addtab-filename');
  var filename = field.val().replace(/.mss/,'') + '.mss';
  if (!code[filename]) {
    $('.carto-tabs').append("<a rel='"+filename+"' href='#code-"+filename.replace(/[^\w+]/g,'_')+"' class='strong quiet tab js-tab round pad0y pad1x truncate'>"+filename.replace(/.mss/,'')+" <span class='icon trash js-deltab pin-topright round pad1'></span></a><!--");
    code[filename] = Tab(filename, '');
  } else {
    editor.messagemodal('Tab name must be different than existing tab "' + filename.replace(/.mss/,'') + '"');
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

  var attr = {};
  // Grab settings form values.
  _($('#settings').serializeArray()).reduce(function(memo, field) {
    if (field.name === 'minzoom' || field.name === 'maxzoom' || field.name === 'scale') {
      memo[field.name] = parseInt(field.value,10);
    } else if (field.name === 'baselayer') {
      if (field.value) {
        editor.model.get('_prefs').baselayer = field.value;
        $('#baselayer').show();
      } else {
        editor.model.get('_prefs').baselayer = '';
        $('#baselayer').hide();
      }
    } else if (field.name && field.value) {
      memo[field.name] = field.value;
    }
    return memo;
  }, attr);
  // Grab interactivity form values.
  _($('#interactivity').serializeArray()).reduce(function(memo, field) {
    memo[field.name] = field.value;
    return memo;
  }, attr);
  // Grab styles, sources.
  attr.styles = _(code).reduce(function(memo, cm, k) {
    if (k !== 'template') memo[k] = cm.getValue();
    return memo;
  }, {});
  attr.source = $('#layers .js-source').map(function() {
    return $(this).attr('id').split('source-').pop();
  }).get().shift();
  attr.template = code.template ? code.template.getValue() : '';

  if (this.model.get('_prefs').saveCenter) {
    var lon = map.getCenter().lng % 360;
    lon += (lon < -180) ? 360 : (lon > 180) ? -360 : 0;
    attr.center = [lon , map.getCenter().lat, map.getZoom() ];
  }

  // New mtime querystring
  mtime = (+new Date).toString(36);

  Editor.changed = false;
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
    return this.messagemodal('Could not save style "' + model.id + '"');

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
        return this.messagemodal(e);
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
  var message = this.messagemodal;
  $('.settings-body').addClass('loading');
  $.ajax('/upload?styleid=' + style)
    .done(function() {
      message(null, '<span class="dark fill-green inline round dot"><span class="icon dark check"></span></span> Uploaded! Your map style is at <a target="blank" href=\'http://mapbox.com/data\'>Mapbox.com</a>');
      $('.settings-body').removeClass('loading');
      return true;
    })
    .error(function(resp) {
      $('.settings-body').removeClass('loading');
      return message(resp.responseText);
    });
};

Editor.prototype.refresh = function(ev) {
  this.messageclear();

  if (!map) {
    map = L.mapbox.map('map');
    map.setView([this.model.get('center')[1], this.model.get('center')[0]], this.model.get('center')[2]);
    map.on('zoomend', function() { $('#zoomedto').attr('class', 'contain z' + (map.getZoom()|0)); });
    map.on('click', inspectFeature({
      id: this.model.id,
      type: 'style',
      map: map
    }));
  }
  map.options.minZoom = this.model.get('minzoom');
  map.options.maxZoom = this.model.get('maxzoom');

  // Refresh map baselayer.
  if (baselayer) map.removeLayer(baselayer);
  baselayer =  baselayer && this.model.get('_prefs').baselayer && this.model.get('_prefs').baselayer === baselayer._tilejson.id ? baselayer : this.model.get('_prefs').baselayer ? L.mapbox.tileLayer(this.model.get('_prefs').baselayer) : false;
  if (baselayer && !$('#xray').is('.active') && $('#baselayer').is('.active')) baselayer.addTo(map);

  // Refresh map layer.
  if (tiles) map.removeLayer(tiles);
  tiles = L.mapbox.tileLayer({
    tiles: ['/style/{z}/{x}/{y}.png?id=' + this.model.id + '&' + mtime ],
    minzoom: this.model.get('minzoom'),
    maxzoom: this.model.get('maxzoom')
  })
  .on('tileload', statHandler('drawtime'))
  .on('load', errorHandler);
  if (!$('#xray').is('.active')) tiles.addTo(map);

  // Refresh xray layer.
  if (xray) map.removeLayer(xray);
  xray = L.mapbox.tileLayer({
    tiles: ['/source/{z}/{x}/{y}.png?id=' + this.model.get('source') + '&' + mtime ],
    minzoom: this.model.get('minzoom'),
    maxzoom: this.model.get('maxzoom')
  });
  if(xray && $('#xray').is('.active')) xray.addTo(map);

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
  $('title').text(this.model.get('name'));
  $('.js-name').text(this.model.get('name') || 'Untitled');
  $('.proj-active .style-name').text(this.model.get('name') || 'Untitled');

  // Set canvas background color.
  if (this.model.get('background'))
    $('#map').css({'background-color':this.model.get('background')});

  // Get existing bookmarks
  if (!this.bookmarks) {
    this.bookmarks = localStorage.getItem(this.model.get('id') + '.bookmarks') ?
      JSON.parse(localStorage.getItem(this.model.get('id') + '.bookmarks')) : {};
    for (var b in this.bookmarks) {
      this.appendBookmark(b);
    }
  }

  return false;
};

window.editor = new Editor({
  el: document.body,
  model: new Style(style)
});
window.editor.refresh();

// Syntax highlighting for carto ref.
$('pre.carto-snippet').each(function(i, elem) {
  var text = $(elem).text();
  $(elem).empty();
  CodeMirror.runMode(text, {name:'carto',reference:window.cartoRef}, $(elem).get(0));
});

};
