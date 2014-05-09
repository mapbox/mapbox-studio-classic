window.Source = function(templates, tm, source, revlayers) {

var map, tiles;

statHandler('srcbytes')();

// set initial page view to avoid #browsefile trap
$(function() {
  if (window.location.hash === '#browsefile') window.location.hash = '#';
});

var Layer = function(id, datasource) {
  var code;
  if (datasource && (datasource.type === 'postgis' || datasource.type === 'sqlite')) {
    var cmParams = {
      lineNumbers: true,
      mode: 'text/x-plsql'
    };
    if (datasource.table) cmParams.value = datasource.table;
    code = CodeMirror($('#layers-' + id + ' div.sql').get(0), cmParams);
    code.getWrapperElement().id = 'layers-' + id + '-code';
  }
  var layer = {
    code: code,
    form: $('#layers-' + id),
    item: $('#layers #'+id)
  };
  layer.refresh = function() {
    var l = _(editor.model.get('vector_layers')).find(function(l) { return l.id === id; });
    var fields = l.fields || {};
    $('div.fields', layer.form).html(templates.layerfields(fields));
  };
  layer.get = function() {
    var attr = _($('#layers-' + id).serializeArray()).reduce(function(memo, field) {
      // @TODO determine what causes empty field names.
      if (!field.name) return memo;
      var group = field.name.split('-')[0];
      var name = field.name.split('-').slice(1).join('-');
      switch (group) {
      case 'fields':
      case 'properties':
      case 'Datasource':
        memo[group] = memo[group] || {};
        memo[group][name] = parseInt(field.value,10).toString() === field.value ? parseInt(field.value, 10) : field.value;
        break;
      default:
        memo[field.name] = parseInt(field.value,10).toString() === field.value ? parseInt(field.value, 10) : field.value;
        break;
      }
      return memo;
    }, {});
    if (code) {
      attr.Datasource = attr.Datasource || {};
      attr.Datasource.table = code.getValue();
    }
    return attr;
  };
  return layer;
};
var layers = _(revlayers).reduce(function(memo, l) {
  memo[l.id] = Layer(l.id, l.Datasource);
  return memo;
}, {});

var Source = Backbone.Model.extend({});
Source.prototype.url = function() { return '/source.json?id=' + this.get('id'); };

var Modal = new views.Modal({ el: $('.modal-content') });
var Editor = Backbone.View.extend({});
Editor.prototype.events = {
  'click .saveas': 'saveModal',
  'click .browsesource': 'browseSource',
  'click .browsestyle': 'browseStyle',
  'click .js-save': 'save',
  'click .js-reset-mode': 'resetmode',
  'click .editor .js-tab': 'togglemode',
  'click .layer .js-delete': 'deletelayer',
  'click .layer .xrayswatch': 'togglelayer',
  'click .js-browsefile': 'browsefile',
  'click #history .js-tab': 'tabbed',
  'click #history .js-ref-delete': 'delstyle',
  'click #settings .js-tab': 'tabbed',
  'click #docs .js-docs-nav': 'scrollto',
  'click .layer .js-tab': 'tabbedFields',
  'click .js-addlayer': 'addlayerModal',
  'submit #addlayer': 'addlayer',
  'click .js-addmapbox': 'addmapboxModal',
  'submit #addmapbox': 'addmapbox',
  'submit #bookmark': 'addbookmark',
  'submit #search': 'search',
  'click #zoom-in': 'zoomin',
  'click #zoom-out': 'zoomout',
  'click #bookmark .bookmark-name': 'gotoBookmark',
  'click #bookmark .js-del-bookmark': 'removebookmark',
  'click .bookmark-n': 'focusBookmark',
  'click .search-result': 'selectSearch',
  'click .search-result-bookmark': 'bookmarkSearch',
  'click .search-n': 'focusSearch',
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
  case (which === 190): // . for fullscreen
    ev.preventDefault();
    this.togglePane('full');
    break;
  case (which === 72): // h for help
    ev.preventDefault();
    this.togglePane('docs');
    break;
  case (which === 220): // \ for settings
    ev.preventDefault();
    this.togglePane('settings');
    break;
  case (which === 66): // b for bookmarks
    ev.preventDefault();
    this.togglePane('bookmark');
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
      filepath = filepath.replace(/\.tm2/,'') + '.tm2source';
      var id = 'tmsource://' + filepath;
      window.editor.model.set({id:id});
      window.editor.save(null, {
        success: function() { window.location = '/source?id=' + id; },
        error: _(window.editor.error).bind(window.editor)
      });
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
Editor.prototype.simpleModal = function(ev) {
  // for modals that just need to be shown, no callbacks/options
  var modalid = $(ev.currentTarget).data('modal');
  if (modalid) Modal.show(modalid);
  return false;
};
Editor.prototype.user = function() {
  window.location.href = window.location.origin + '/unauthorize';
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
Editor.prototype.tabbedFields = function(ev) {
  $(ev.currentTarget).parent('.layer').addClass('active').siblings('.layer').removeClass('active');
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
Editor.prototype.togglemode = function(ev) {
  var target = $(ev.currentTarget);
  switch (target.attr('href').split('#editor-').pop()) {
    case 'sql':
        $('body').addClass('sql').removeClass('conf').removeClass('fields');
        break;
    case 'conf':
        $('body').addClass('conf').removeClass('sql').removeClass('fields');
        break;
    case 'fields':
        $('body').addClass('fields').removeClass('sql').removeClass('conf');
        break;
  }
  tabbedHandler(ev);
  return false;
};

Editor.prototype.appendBookmark = function(name) {
  $('<li class="keyline-top contain">'+
    '<a href="#" class="icon marker quiet pad0 col12 small truncate bookmark-name">'+name+'</a>'+
    '<a href="#" class="icon keyline-left trash js-del-bookmark quiet pin-topright fill-dark pad0" title="Delete"></a>'+
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
  localStorage.setItem('tm2.bookmarks', JSON.stringify(this.bookmarks));
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
  localStorage.setItem('tm2.bookmarks', JSON.stringify(this.bookmarks));
  field.val('');
  this.appendBookmark(name);
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
  if (this.bookmarks[name]) return false;
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
Editor.prototype.search = function(ev) {
  ev.preventDefault();
  var query = $('#search input').get(0).value;
  // This query is empty or only whitespace.
  if (/^\s*$/.test(query)) return null;

  // This query is too short. Wait for more input chars.
  if (query.length < 3) return;

  // The query matches what is currently displayed.
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
        '<a href="#" class="dark pad0 quiet small search-result truncate col12 align-middle'+(!idx ? 'active fill-white': '')+'" data-coords="'+coords+'" data-type="'+result[0].type+'" data-bounds="'+(result[0].bounds||false)+'" data-idx="'+idx+'">'+
        '<strong>'+result[0].name+'</strong><span class="small pad1x">'+place+'</span>'+
        '</a>'+
        '<a href="#bookmark" class="pad0 icon marker dark search-result-bookmark pin-topright quiet center keyline-left" title="Bookmark"></a>'+
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
  $('#search-results a.active').removeClass('active fill-lighten0');
  $(selection).addClass('active fill-lighten0');
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
Editor.prototype.resetmode = function(ev) {
  $('body').removeClass('fields').removeClass('sql').removeClass('conf');
  $('.editor a.js-tab[href=#editor-conf]').addClass('active').siblings('a').removeClass('active');
};
Editor.prototype.togglelayer = function(ev) {
  $(ev.currentTarget).toggleClass('disabled');
};
Editor.prototype.addlayerModal = function() {
  Modal.show('addlayer');
  return false;
};
Editor.prototype.addlayer = function(ev) {
  var values = _($('#addlayer').serializeArray()).reduce(function(memo, field) {
    memo[field.name] = field.value;
    return memo;
  }, {});

  if (!values.id || !templates['layer' + values.type]) return false;

  if (!layers[values.id]) {
    var layer = {
      tm: tm,
      vt: {},
      id: values.id,
      properties: {
        minzoom:0,
        maxzoom:22,
        'buffer-size':0
      },
      Datasource: {
        type: values.type
      }
    };
    $('#editor').prepend(templates['layer' + values.type](layer));
    $('#layers .js-menu-content').prepend(templates.layeritem(layer));
    layers[values.id] = Layer(values.id, layer.Datasource);

    Modal.close();
    window.location.hash = '#layers-' + values.id;
    $('#layers .js-menu-content').sortable('destroy').sortable();

  } else {
    editor.messagemodal('Layer name must be different from existing layer "' + values.id + '"');
  }
  return false;
};
Editor.prototype.deletelayer = function(ev) {
  var id = $(ev.currentTarget).attr('id').split('-').pop();
  if (!layers[id]) return false;
  if (confirm('Remove layer "' + id + '"?')) {
    layers[id].form.remove();
    layers[id].item.remove();
    $('#layers .js-menu-content').sortable('destroy').sortable();
    delete layers[id];
  }
  window.location.href = '#';
  return false;
};
Editor.prototype.error = function(model, resp) {
  this.messageclear();
  if (resp.responseText) {
    this.messagemodal(resp.responseText);
  } else {
    this.messagemodal('Could not save source "' + model.id + '"');
  }
};
Editor.prototype.save = function(ev, options) {
  if (this.model.get('id').indexOf('///tmp-') !== -1) return;

  // Set map in loading state.
  $('#full').addClass('loading');

  // Grab settings form values.
  var attr = _($('#settings').serializeArray()).reduce(function(memo, field) {
    memo[field.name] = parseInt(field.value,10).toString() === field.value ? parseInt(field.value, 10) : field.value;
    return memo;
  }, this.model.attributes);

  // Grab layers. Reverse at save time.
  attr.Layer = _(layers).map(function(l) { return l.get(); });
  attr.Layer.reverse();

  // Save center, disabled layers.
  attr._prefs = attr._prefs || {};
  if (this.model.get('_prefs').saveCenter) {
    var lon = map.getCenter().lng % 360;
    lon += (lon < -180) ? 360 : (lon > 180) ? -360 : 0;
    attr.center = [lon , map.getCenter().lat, map.getZoom() ];
  }
  attr._prefs.disabled = _($('#layers .layer').map(function(v) {
    return $('.xrayswatch.disabled', this).size() ? $(this).attr('id') : false;
  })).compact();

  options = options || {
    success:_(this.refresh).bind(this),
    error: _(this.error).bind(this)
  };
  this.model.save(attr, options);

  return ev && !!$(ev.currentTarget).is('a');
};
Editor.prototype.refresh = function(ev) {
  this.messageclear();

  var rand = Math.random().toString(16).split('.')[1];

  if (!map) {
    map = L.mapbox.map('map');
    map.setView([this.model.get('center')[1], this.model.get('center')[0]], this.model.get('center')[2]);
    map.on('zoomend', function() { $('#zoomedto').attr('class', 'contain z' + (map.getZoom()|0)); });
    map.on('click', inspectFeature({
      id: this.model.id,
      type: 'source',
      map: map
    }));
  }
  map.options.minZoom = this.model.get('minzoom');
  map.options.maxZoom = 22;

  // Refresh map layer.
  if (tiles) map.removeLayer(tiles);
  tiles = L.mapbox.tileLayer({
    tiles: ['/source/{z}/{x}/{y}.png?id=' + this.model.id + '&' + rand ],
    minzoom: this.model.get('minzoom'),
    maxzoom: 22
  })
  .on('tileload', statHandler('srcbytes'))
  .on('load', errorHandler)
  .addTo(map);

  // Refresh map title.
  $('title').text(this.model.get('name'));
  $('.js-name').text(this.model.get('name') || 'Untitled');

  // Clear save notice.
  if (window.location.hash === '#refresh') {
    window.location.hash = '#';
  }

  // Rerender fields forms.
  _(layers).each(function(l) { l.refresh(); });

  // Get existing bookamarks
  this.bookmarks = localStorage.getItem('tm2.bookmarks') ? JSON.parse(localStorage.getItem('tm2.bookmarks')) : {};
  for (var b in this.bookmarks) {
    this.appendBookmark(b);
  }

  return false;
};
Editor.prototype.browsefile = function(ev) {
  Modal.show('browsefile');
  var target = $(ev.currentTarget).siblings('input[name=Datasource-file]');
  $('.browsefile-pending').removeClass('browsefile-pending');
  target.addClass('browsefile-pending');
  $('#browsefile input[name=basename]').attr('title', target.attr('title'));
  $('#browsefile input[name=basename]').attr('pattern', target.attr('pattern'));
  $('#browsefile input[name=basename]').attr('placeholder', target.attr('placeholder'));

  // File browser.
  new views.Browser({
    el: $('#browsefile'),
    filter: function(file) {
      var target = $('.browsefile-pending');
      var pattern = target.size() && target.attr('pattern') && new RegExp(target.attr('pattern'));
      if (pattern) {
          return file.type === 'dir' || pattern.test(file.basename);
      } else {
          return file.type === 'dir';
      }
    },
    isFile: function(file) {
      var target = $('.browsefile-pending');
      var pattern = target.size() && target.attr('pattern') && new RegExp(target.attr('pattern'));
      if (pattern) {
          return file.type === 'dir' || pattern.test(file);
      } else {
          return file.type === 'dir';
      }
    },
    callback: function(err, filepath) {
      var target = $('.browsefile-pending');
      if (err || !target.size()) {
        window.location.href = '#';
      } else {
        target.val(filepath);
        window.location.href = '#' + target.parents('form').attr('id');
      }
    }
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
Editor.prototype.messageclear = messageClear;
Editor.prototype.delstyle = delStyle;
Editor.prototype.tabbed = tabbedHandler;
Editor.prototype.addmapbox = addMapBox;

window.editor = new Editor({
  el: document.body,
  model: new Source(source)
});
window.editor.refresh();

};
