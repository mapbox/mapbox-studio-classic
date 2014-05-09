var addMapBox = function(ev) {
  var attr = _($('#addmapbox').serializeArray()).reduce(function(memo, field) {
    memo[field.name] = field.value;
    return memo;
  }, {});
  window.location.href = '/source?id=mapbox:///' + attr.id;
  return false;
};

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
    if (options.type === 'style' && !$('#xray').is('.active')) return;
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
    this.$el.children().remove();
    this.$el.parent().removeClass('active');
    this.active.callback();
    this.active = false;
};
views.Modal.prototype.show = function(id, options, callback) {
  if (id[0] != '#') id = '#' + id;
  options = options || {};
  if (this.active && !options.overwrite)
    return new Error('Modal already active');

  var modal = {
    el: $(id),
    callback: callback || function() {}
  };

  this.$el.append(modal.el.clone()).parent().addClass('active');
  this.active = modal;
};
