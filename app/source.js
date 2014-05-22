window.Source = function(templates, cwd, tm, source, revlayers) {

var map;
var tiles;
var mtime = (+new Date).toString(36);

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

var Modal = new views.Modal({
  el: $('.modal-content'),
  templates: templates
});
var Editor = Backbone.View.extend({});
Editor.prototype.events = {
  'click .js-browsesource': 'browseSource',
  'click .js-browsestyle': 'browseStyle',
  'click .js-save': 'save',
  'click .js-saveas': 'saveModal',
  'click .js-reset-mode': 'resetmode',
  'click .editor .js-tab': 'togglemode',
  'click .layer .js-delete': 'deletelayer',
  'click .layer .js-xrayswatch': 'togglelayer',
  'click .js-browsefile': 'browsefile',
  'click #history .js-tab': 'tabbed',
  'click #history .js-ref-delete': 'delstyle',
  'click #settings .js-tab': 'tabbed',
  'click #docs .js-docs-nav': 'scrollto',
  'click .layer .js-tab': 'tabbedFields',
  'click .js-addlayer': 'addlayerModal',
  'submit #addlayer': 'addlayer',
  'keydown': 'keys'
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
  Modal.show('browsersave', {type:'source', cwd:cwd});
  new views.Browser({
    el: $('.modal-content #saveas'),
    filter: function(file) { return file.type === 'dir' && !(/\.tm2$/).test(file.basename); },
    callback: function(err, filepath) {
      if (err) return false; // @TODO
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
  Modal.show('browseropen', {type:'source', cwd:cwd});
  new views.Browser({
    el: $('.modal-content #browsesource'),
    filter: function(file) { return file.type === 'dir' || (/\.tm2source$/.test(file.basename) || /\.tm2$/.test(file.basename)) ; },
    isFile: function(file) { return (/\.tm2source$/.test(file) || /\.tm2$/.test(file.basename)); },
    callback: function(err, filepath) {
      if (err) return false; // @TODO
      window.location = '/source?id=tmsource://' + filepath;
      return false;
    }
  });
  return false;
};
Editor.prototype.browseStyle = function() {
  Modal.show('browseropen', {type:'style', cwd:cwd});
  new views.Browser({
    el: $('.modal-content #browsestyle'),
    filter: function(file) { return file.type === 'dir' || /\.tm2$/.test(file.basename); },
    isFile: function(file) { return /\.tm2$/.test(file); },
    callback: function(err, filepath) {
      if (err) return false; // @TODO
      filepath = filepath.replace(/\.tm2/, '') + '.tm2';
      window.location = '/style?id=tmstyle://' + filepath;
      return false;
    }
  });
  return false;
};
Editor.prototype.user = function() {
  window.location.href = window.location.origin + '/unauthorize';
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
        'buffer-size': 8
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
    Modal.show('error', 'Layer name must be different from existing layer "' + values.id + '"');
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
    var json;
    try { json = JSON.parse(resp.responseText); } catch(err) {}
    Modal.show('error', json ? json.message : resp.responseText);
  } else {
    Modal.show('error', 'Could not save source "' + model.id + '"');
  }
};
Editor.prototype.save = function(ev, options) {
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
    return $('.js-xrayswatch.disabled', this).size() ? $(this).attr('id') : false;
  })).compact();

  // New mtime querystring.
  mtime = (+new Date).toString(36);

  options = options || {
    success:_(this.refresh).bind(this),
    error: _(this.error).bind(this)
  };
  this.model.save(attr, options);

  return ev && !!$(ev.currentTarget).is('a');
};
Editor.prototype.refresh = function(ev) {
  this.messageclear();

  if (!map) {
    map = L.mapbox.map('map');
    map.setView([this.model.get('center')[1], this.model.get('center')[0]], this.model.get('center')[2]);
    map.on('zoomend', function() { $('#zoomedto').attr('class', 'contain z' + (map.getZoom()|0)); });
    map.on('click', inspectFeature({
      id: this.model.id,
      type: 'source',
      map: map
    }));
    new views.Maputils({
      el: $('#view'),
      map: map,
      model: this.model
    });
  }
  map.options.minZoom = this.model.get('minzoom');
  map.options.maxZoom = 22;

  // Refresh map layer.
  if (tiles) map.removeLayer(tiles);
  tiles = L.mapbox.tileLayer({
    tiles: ['/source/{z}/{x}/{y}.png?id=' + this.model.id + '&' + mtime ],
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
  Modal.show('browser', { id:'browsefile', cwd:cwd, label:'Select'});
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
      Modal.close();
    }
  });

};

Editor.prototype.messageclear = messageClear;
Editor.prototype.delstyle = delStyle;
Editor.prototype.tabbed = tabbedHandler;

window.editor = new Editor({
  el: document.body,
  model: new Source(source)
});
window.editor.refresh();

// Sortable layers for local sources.
if (source.id.indexOf('tmsource://' === 0)) {
  $('#layers .js-menu-content').sortable();
  $('#layers .js-menu-content').bind('sortupdate', function(ev, ui) {
    var ids = $('#layers .js-menu-content .js-layer').map(function() {
      return $(this).attr('id');
    }).get();
    layers = _(ids).reduce(function(memo, id) {
      memo[id] = layers[id];
      return memo;
    }, {});
  });
}

};
