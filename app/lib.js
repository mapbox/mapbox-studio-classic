var tabbedHandler = function(ev) {
  var target = ev.currentTarget.href.split('#').pop();
  var context = target.split('-').slice(0,-1).join('-');
  $('#' + context + ' .active').removeClass('active');
  $(ev.currentTarget).addClass('active');
  $('#' + target).addClass('active');
  return false;
};

var rangeHandler = function(el, bound, target) {
  var limit = parseInt($(target).val(),10);
  if (bound === 'max') {
    el.value = parseInt(el.value, 10) < limit ? el.value : limit;
  } else if (bound === 'min') {
    el.value = parseInt(el.value, 10) > limit ? el.value : limit;
  }
  $('#' + el.id + '-val').text(el.value);
};

var errorHandler = _(function() {
  if (document.cookie.indexOf('errors') === -1) return;
  var html = document.cookie
    .split('errors=').pop()
    .split(';')
    .shift()
    .split('|')
    .filter(function(msg) { return msg; })
    .map(function(msg) {
      return "<div class='msg pad1 fill-darken1'>" + decodeURIComponent(msg) + "</div>";
    });
  $('#map-errors').html(html);
}).throttle(50);

var statHandler = function(key) {
  var unit = key === 'srcbytes' ? 'k' : 'ms';
  return _(function() {
    if (document.cookie.indexOf(key) === -1) return;
    var max = 300;
    var stats = _(document.cookie
      .split(key + '=').pop()
      .split(';').shift()
      .split('.')).reduce(function(memo, z) {
      z = z.split('-');
      if (z.length !== 4) return memo;
      memo[z[0]] = z.slice(1,4).map(function(v) { return parseInt(v,10); });
      return memo;
    }, {});
    var html = "<a href='#' class='inline pad1 quiet pin-bottomright icon close'></a>";

    function round(v) { return Math.round(v * 0.001); }

    for (var z = 0; z < 23; z++) {
      var s = stats[z];
      if (key === 'srcbytes' && s) {
        s = s.map(round);
      }
      var l = s ? Math.round(Math.min(s[0],max)/max*100) : null;
      var w = s ? Math.round((s[2]-s[0])/max*100) : null;
      var a = s ? Math.round(Math.min(s[1],max)/max*100) : null;
      html += [
        "<span class='clip strong micro col12 quiet z z",z,"'>",
        "<a href='#zoomedto' class='col3 center strong quiet keyline-right'>z",z,"</a>",
        s ? "<span class='strong col3 pad0x avg'>"+s[1]+unit+"</span>" : '',
        s ? "<span class='range'>" : '',
        s ? "<span class='minmax' style='margin-left:"+l+"%; width:"+w+"%;'></span>" : '',
        s ? "<span class='marker' style='margin-left:"+a+"%'></span>" : '',
        s ? "</span>" : '',
        "</span>"
      ].join('');
    }
    $('#zoomedto').html(html);
  }).throttle(50);
};

var messageModal = function(text, html) {
  if (html) {
    $('#message .js-message').html(html);
  } else {
    $('#message .js-message').text(text);
  }
  window.location.hash = '#message';
};

var messageClear = function() {
  $('#message .js-message').text('');
  $('#full').removeClass('loading');
};

var delStyle = function(ev) {
  var id = $(ev.currentTarget).attr('href');
  var parent = $(ev.currentTarget).parent();
  var name = id.split('/').pop();
  if (confirm('Remove "' + name + '"?')) {
    $.ajax({
      url:'/history/' + id,
      type: 'DELETE',
      success: function(resp) {
        parent.remove();
      },
      error: function(resp) {
        messageModal(resp.status + " " + resp.statusText);
      }
    });
  }
  return false;
};

var inspectFeature = function(options) {
  var map = options.map;
  var popup;
  map.on('layeradd', function() {
    if (popup) map.closePopup(popup);
    popup = null;
  });
  return function(ev) {
    if (options.type === 'style' && !$('.xray-toggle').is('.active')) return;
    var rand = Math.random().toString(16).split('.')[1];
    var lon = ev.latlng.wrap().lng;
    var lat = ev.latlng.wrap().lat;
    var zoom = map.getZoom()|0;
    $.ajax({
      url: '/' + options.type + '/' + zoom + ',' + lon + ',' + lat + '.json?id=' + options.id + '&' + rand,
      dataType: 'json',
      success: function(data) {
        if (!_(data).size()) return;
        popup = L.popup({
          closeButton:false,
          minWidth:200
        })
        .setLatLng(ev.latlng)
        .setContent(templates.xraypopup(data))
        .openOn(map);
      },
      error: function(resp) {}
    });
  };
};

var views = {};

views.Browser = Backbone.View.extend({});
views.Browser.prototype.events = {
  'click .cwd a': 'browse',
  'click .list a': 'browse',
  'submit': 'submit'
};
views.Browser.prototype.initialize = function(options, initCallback) {
  this.callback = options.callback || function() {};
  this.filter = options.filter || function(f) { return true; };
  this.isFile = options.isFile || function() {};
  this.cwd = this.$('input[name=cwd]').val();
  return this.render();
};
views.Browser.prototype.render = function() {
  var view = this;
  $.ajax({
    url: '/browse/' + view.cwd,
    dataType: 'json',
    success: function(resp) {
      view.$('input[name=cwd]').val(view.cwd);
      view.$('.cwd strong').text(view.cwd);
      view.$('.cwd a').attr('href', '#' + view.cwd.split('/').slice(0,-1).join('/'));
      view.$('.list').html(_(resp).chain()
        .filter(view.filter)
        .map(function(f) {
          var type = (f.type == 'dir') ? 'folder' : 'document';
          var targetFile = view.isFile(f.basename) ? '' : 'quiet';
          return "<a class='icon " + targetFile + " " + type + " strong small pad1x pad0y truncate col12 keyline-bottom' href='#" + f.path + "'>" + f.basename + "</a>";
        })
        .value()
        .join('\n'));
      // Reset scroll position to top.
      view.$('.list').get(0).scrollTop = 0;
    },
    // @TODO
    error: function(resp) {}
  });
};

views.Browser.prototype.submit = function(ev) {
  // Grab settings form values.
  var values = _($(this.el).serializeArray()).reduce(function(memo, field) {
    if (field.name && field.value) {
      memo[field.name] = field.value;
    }
    return memo;
  }, {});
  if (!values.basename) return false;
  if (!this.callback) return false;
  this.callback(null, values.basename[0] === '/' ?
    values.basename :
    values.cwd + '/' + values.basename);
  return false;
};
views.Browser.prototype.browse = function(ev) {
  var target = $(ev.currentTarget);
  if (target.is('.document') || this.isFile(target.attr('href').split('#').pop())) {
    this.$('input[name=basename]').val(target.text());
  } else if (target.is('.folder') || target.is('.prev')) {
    this.cwd = target.attr('href').split('#').pop();
    this.render();
  }
  return false;
};

views.Modal = Backbone.View.extend({});
views.Modal.prototype.events = {
  'click a.close': 'close'
};
views.Modal.prototype.active = false;
views.Modal.prototype.modals = {};
views.Modal.prototype.close = function() {
    // default, just close the modal
    // need to also accept a url and redirect there on close
    if (!this.active) return false;
    this.$el.empty();
    this.$el.parent().removeClass('active');
    this.active.callback();
    this.active = false;
};
views.Modal.prototype.show = function(id, options, callback) {
    options = options || {};
    callback = callback || function(err) { if (err) console.warn(err); };

    if (!this.options.templates['modal'+id]) return callback(new Error('Modal template "modal'+id+'" not found'));

    // Close active modal first. Maybe implement modal stacking in the future.
    if (this.active) this.close();

    try {
        var html = this.options.templates['modal' + id](options);
    } catch(err) {
        return callback('Error in template "modal' + id + '": ' + err.toString());
    }

    var modal = { el: $(html), callback: callback };
    this.$el.append(modal.el);
    this.$el.parent().addClass('active');
    this.active = modal;
};

views.Maputils = Backbone.View.extend({});
views.Maputils.prototype.events = {
  'submit #bookmark': 'addbookmark',
  'submit #search': 'search',
  'click #bookmark .js-bookmark-name': 'gotoBookmark',
  'click #bookmark .js-del-bookmark': 'removebookmark',
  'click .bookmark-n': 'focusBookmark',
  'click .search-n': 'focusSearch',
  'click .js-search-result': 'selectSearch',
  'click .js-search-result-bookmark': 'bookmarkSearch',
  'keydown': 'keys'
};
views.Maputils.prototype.initialize = function (options) {
  this.map = options.map;
  this.bookmarks = localStorage.getItem(this.model.get('id') + '.bookmarks') ?
    JSON.parse(localStorage.getItem(this.model.get('id') + '.bookmarks')) : {};
  for (var b in this.bookmarks) {
    this.appendBookmark(b);
  }
};
views.Maputils.prototype.keys = function(ev) {
  if ((ev.which === 38 || ev.which == 40) && window.location.hash == '#search') {
    // up and down on search results
    ev.preventDefault();
    this.navSearch(ev, (ev.which === 38 ? 1 : -1));
    return;
  }
};
views.Maputils.prototype.appendBookmark = function(name) {
  $('<li class="keyline-top contain">'+
    '<a href="#" class="icon marker quiet pad0 col12 small truncate js-bookmark-name">'+name+'</a>'+
    '<a href="#" class="icon keyline-left trash js-del-bookmark quiet pin-topright pad0" title="Delete"></a>'+
    '</li>').appendTo('#bookmark-list');
};
views.Maputils.prototype.gotoBookmark = function(ev) {
  var target = $(ev.currentTarget),
      coords = this.bookmarks[target.text()];
  this.map.setView([coords[0], coords[1]], coords[2]);
  return false;
};
views.Maputils.prototype.removebookmark = function(ev) {
  ev.preventDefault();
  var target = $(ev.currentTarget).prev('a'),
      name = target.text();
  target.parent('li').remove();
  if (this.bookmarks[name]) delete this.bookmarks[name];
  localStorage.setItem(this.model.get('id') + '.bookmarks', JSON.stringify(this.bookmarks));
  return false;
};
views.Maputils.prototype.addbookmark = function(ev) {
  ev.preventDefault();
  var coords = this.map.getCenter(),
      zoom = this.map.getZoom(),
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
views.Maputils.prototype.focusBookmark = function(ev) {
  $('#addbookmark').focus();
  return;
};
views.Maputils.prototype.search = function(ev) {
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
    this.map.setView([latlon.lat, latlon.lon]);
    return false;
  }

  var view = this;

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
        '<a href="#" class="pad0 quiet small js-search-result truncate col12 align-middle'+(!idx ? 'active fill-darken0': '')+'" data-coords="'+coords+'" data-type="'+result[0].type+'" data-bounds="'+(result[0].bounds||false)+'" data-idx="'+idx+'">'+
        '<strong>'+result[0].name+'</strong><span class="small pad1x">'+place+'</span>'+
        '</a>'+
        '<a href="#bookmark" class="pad0 icon marker js-search-result-bookmark pin-topright quiet center keyline-left" title="Bookmark"></a>'+
        '</li>').appendTo($results);
      view.selectSearch(false, $('#search-results [data-idx="0"]'));
    });
  });
  return false;
};
views.Maputils.prototype.selectSearch = function(ev, selection) {
  var data;
  if (ev) {
    ev.preventDefault();
    selection = ev.currentTarget;
    data = ev.currentTarget.dataset;
  } else {
    data = selection[0].dataset;
  }
  $('#search-results a.active').removeClass('active fill-darken0');
  $(selection).addClass('active fill-darken0');
  if (data.bounds !== 'false') {
    var bounds = data.bounds.split(',');
    this.map.fitBounds([[bounds[1],bounds[0]], [bounds[3],bounds[2]]]);
  } else {
    var coords = data.coords.split(',');
    if (data.type === 'address') {
      this.map.setView(coords, Math.max(16, this.map.getZoom()));
    } else if (data.type === 'street') {
      this.map.setView(coords, Math.max(15, this.map.getZoom()));
    } else {
      this.map.setView(coords);
    }
  }
  return false;
};
views.Maputils.prototype.bookmarkSearch = function(ev, selection) {
  var result = $(ev.currentTarget).siblings('.js-search-result');
  this.selectSearch(false, result);
  $('#addbookmark').val(result.find('strong').text()+', '+result.find('span').text());
  $('#bookmark').submit();
};
views.Maputils.prototype.navSearch = function(ev, dir) {
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
views.Maputils.prototype.focusSearch = function(ev) {
  $('#dosearch').focus();
  return;
};
