window.Print = function(templates, cwd, style) {

var map;
var baselayer;
var tiles;
var grids;
var gridc;
var boundingBox;
var mtime = (+new Date).toString(36);
var limit = 20000;
var sm = new SphericalMercator();


var Printer = Backbone.View.extend({});
var Modal = new views.Modal({
  el: $('.modal-content'),
  templates: templates
});

var Style = Backbone.Model.extend({});
Style.prototype.url = function() { return '/style.json?id=' + this.get('id'); };

var Source = Backbone.Model.extend({});
Source.prototype.url = function() { return '/source.json?id=' + this.get('id'); };

Printer.prototype.events = {
  'click .js-browsestyle': 'browseStyle',
  'click .js-recache': 'recache',
  'click #history .js-ref-delete': 'delstyle',
  'click .js-modalsources': 'modalsources',
  'keydown': 'keys',
  'click .js-info': 'toggleInfo',
  'click .reselect': 'bboxReselect',
  'change #resolution': 'calculateTotal',
  'change #format': 'updateformat',
  'change #bboxInput': 'modifycoordinates',
  'change #centerInput': 'modifycoordinates'
};

Printer.prototype.keys = function(ev) {
  // Escape. Collapses windows, dialogs, modals, etc.
  if (ev.which === 27) {
    if (Modal.active) Modal.close();
    window.location.href = '#';
  }
  if ((!ev.ctrlKey && !ev.metaKey) || ev.shiftKey) return;
  var which = ev.which;
  switch (true) {
  case (which === 72): // h for help
    ev.preventDefault();
    this.togglePane('docs');
    break;
  case (which === 190): // . for fullscreen
    ev.preventDefault();
    this.togglePane('full');
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

Printer.prototype.browseStyle = function() {
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
Printer.prototype.scrollto = function(ev) {
    id = $(ev.currentTarget).attr('href').split('#').pop();
    document.getElementById(id).scrollIntoView();
    return false;
};
Printer.prototype.togglePane = function(name) {
  var loc = location.href;
  if (loc.indexOf('#'+name) === -1) {
    location.href = loc.substring(0, loc.indexOf('#'))+'#'+name;
  } else {
    location.href = loc.replace('#'+name, '#');
  }
};
Printer.prototype.toggleInfo = function(ev) {
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

Printer.prototype.delstyle = delStyle;

Printer.prototype.modalsources = function(ev) {
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

Printer.prototype.recache = function(ev) {
  this.model.set({_recache:true});
  this.save(ev);
  return false;
};

Printer.prototype.toggleInfo = function(ev) {
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

Printer.prototype.bboxEnable = function(ev){
  if (!boundingBox._enabled) {
    this.calculateBounds();

    // Enable the location filter
    boundingBox.enable();
    boundingBox.fire('enableClick');

    $('#export').removeClass('disabled');
    $('.attributes').removeClass('quiet');
    $('#bboxInput').prop('disabled', false);
    $('#centerInput').prop('disabled', false);
  }
};

Printer.prototype.bboxReselect = function(){
  if (!boundingBox._enabled) return;
  map.zoomOut();
  this.calculateBounds();
};

Printer.prototype.calculateBounds = function(){
  var sidebar = $('#full').width();
  var bounds = map.getBounds(),
    zoom = map.getZoom(),
    ne = sm.px([bounds._northEast.lng, bounds._northEast.lat], zoom),
    sw = sm.px([bounds._southWest.lng, bounds._southWest.lat], zoom),
    center = map.getCenter(),
    center = sm.px([center.lng, center.lat], zoom);

  ne = sm.ll([center[0] + sidebar/2, ne[1]], zoom);
  sw = sm.ll([center[0] - sidebar/2, sw[1]], zoom);

  boundingBox.setBounds(L.latLngBounds(L.latLng(ne[1], ne[0]), L.latLng(sw[1], sw[0])));
};

Printer.prototype.calculateCoordinates = function(ev){
  var bounds = boundingBox.getBounds(),
    center = [(bounds._northEast.lat - bounds._southWest.lat)/2 + bounds._southWest.lat, (bounds._northEast.lng - bounds._southWest.lng)/2 + bounds._southWest.lng],
    zoom = map.getZoom(),
    decimals = 4,
    format = $('input[name=format]:checked').prop('value');

  window.exporter.model.set({
    coordinates: {
      zoom: zoom,
      scale: $('input[name=resolution]:checked').prop('value'),
      format: format,
      quality: (format === 'png') ? 256 : 100,
      bbox: [
        parseFloat(bounds._southWest.lng.toFixed(decimals)),
        parseFloat(bounds._southWest.lat.toFixed(decimals)),
        parseFloat(bounds._northEast.lng.toFixed(decimals)),
        parseFloat(bounds._northEast.lat.toFixed(decimals))
      ],
      center: [
        center[0].toFixed(decimals),
        center[1].toFixed(decimals)
      ]
    }
  });
  var coordinates = window.exporter.model.get('coordinates');
  $('#bboxInput').prop('value', coordinates.bbox.toString());
  $('#centerInput').prop('value', coordinates.center[0]+','+coordinates.center[1]);

  this.calculateTotal();
};

Printer.prototype.calculateTotal = function(){
  if (!boundingBox.isEnabled()) return;
  var scale = $('input[name=resolution]:checked').prop('value'),
    zoom = map.getZoom(),
    bbox = window.exporter.model.get('coordinates').bbox,
    center;
  sm.size = scale * 256;

  this.model.get('coordinates').scale = scale;

  var topRight = sm.px([bbox[2], bbox[3]], zoom),
    bottomLeft = sm.px([bbox[0], bbox[1]], zoom),
    w = (topRight[0] - bottomLeft[0]) * scale,
    h = (bottomLeft[1] - topRight[1]) * scale,
    percentage = ( w > h ) ? Math.ceil((w / limit) * 100) : Math.ceil((h / limit) * 100);

  $('#pixelX').html(w);
  $('#pixelY').html(h);

  $('#inchX').html((w / (scale * 72)).toFixed(2));
  $('#inchY').html((h / (scale * 72)).toFixed(2));

  if (w > limit) {
    $('#pixelX').addClass('warning');
  } else {
    $('#pixelX').removeClass('warning');
  }
  if (h > limit) {
    $('#pixelY').addClass('warning');
  } else {
    $('#pixelY').removeClass('warning');
  }
  if (percentage > 100 ) $('#export').addClass('disabled').removeAttr('href');
  if (percentage <= 100 ) {
    $('#export').removeClass('disabled');
    this.updateurl();
  }
  this.imageSizeStats();
};

Printer.prototype.modifycoordinates = function(ev){
  var bounds = $('#bboxInput').prop('value').split(',').map(parseFloat);
  var center = $('#centerInput').prop('value').split(',').map(parseFloat);
  var bSum = bounds.reduce(function(a, b){ return a + b; });
  var bboxSum = window.exporter.model.get('coordinates').bbox.reduce(function(a, b){ return a + b; });
  if (bSum != bboxSum) {
    boundingBox.setBounds(L.latLngBounds(L.latLng(bounds[1], bounds[0]), L.latLng(bounds[3], bounds[2])));
    center = [ (bounds[3] - bounds[1])/2 + bounds[1], (bounds[2] - bounds[0])/2 + bounds[0]];
    map.setView(center, window.exporter.model.get('coordinates').zoom);
    return;
  }
  var cSum = center.reduce(function(a, b){ return a + b; });
  var centerSum = window.exporter.model.get('coordinates').center.reduce(function(a, b){ return a + b; });
  if (cSum != centerSum) {
    var h = bounds[3] - bounds[1];
    var w = bounds[0] - bounds[2];
    bounds = [center[1] - (w/2), center[0] - (h/2), center[1] + (w/2), center[0] + (h/2)];
    boundingBox.setBounds(L.latLngBounds(L.latLng(bounds[1], bounds[0]), L.latLng(bounds[3], bounds[2])));
    map.setView([center[0], center[1]], window.exporter.model.get('coordinates').zoom);
    return;
  }
};

Printer.prototype.updateformat = function(){
  var format = $('input[name=format]:checked').prop('value');

  if (!boundingBox.isEnabled()) return;
  window.exporter.model.get('coordinates').format = format;
  window.exporter.model.get('coordinates').quality = (format === 'png') ? 256 : 100;
  this.updateurl();
};

Printer.prototype.updateurl = function(){
  if (!boundingBox.isEnabled()) return;
  var coords = window.exporter.model.get('coordinates');
  var url = 'http://localhost:3000/static/' +
    coords.zoom + '/' +
    coords.bbox.toString() +
    '@' + coords.scale + 'x' +
    '.' + coords.format +
    '?id='+window.exporter.model.get('id');

  $('#export').attr('href', url);
};

Printer.prototype.imageSizeStats = function(){
  var html = "<a href='#' class='inline pad1 quiet pin-bottomright icon close'></a>";

  var minZoom = window.exporter.model.get('minzoom'),
    maxZoom = window.exporter.model.get('maxzoom'),
    w = $('#pixelX').html() | 0,
    h = $('#pixelY').html() | 0,
    zoom = map.getZoom(),
    perc;

  for (var z = 0; z < 23; z++) {
    if (z >= minZoom && z <= maxZoom && boundingBox.isEnabled()) {
      var zoomDiff = Math.abs(z - zoom);
      var greatest = ( w > h ) ? w : h;
      if (z > zoom) perc = Math.ceil((greatest * 100 * Math.pow(2, zoomDiff)) / limit);
      if (z < zoom) perc = Math.ceil((greatest  * 100 * (1/Math.pow(2, zoomDiff))) / limit);
      if (z === zoom ) perc = Math.ceil((greatest / limit) * 100);
    }
    html += [
      "<span class='clip strong micro col12 quiet z z",z,"'>",
      "<a href='#zoomedto' class='col3 center strong quiet keyline-right'>z",z,"</a>",
      perc ? "<span class='truncate col9 strong perc pad0x " : '',
      perc > 100 ? "warning'" : '',
      perc > 1000 ? "'> >1000%</span>" : perc ? "'>"+perc+"%</span>" : '',
      "</span>"
    ].join('');
  }
  html += [
      "<span class='clip strong micro col12 quiet z z23'>",
      "<p class='truncate col12 pad1x'>% of image size limit</p>",
      "</span>"
    ].join('');
  $('#zoomedto').html(html);
};

Printer.prototype.refresh = function(ev) {
  var calcTotal = this.calculateTotal.bind(this);

  if (!map) {
    map = L.mapbox.map('map');

    boundingBox = new L.LocationFilter().addTo(map);
    boundingBox.on('enabled', this.calculateCoordinates.bind(this));
    boundingBox.on('change', this.calculateCoordinates.bind(this));

    map.setView([this.model.get('center')[1], this.model.get('center')[0]], this.model.get('center')[2]);
    map.on('zoomend', function() {
      var zoom = map.getZoom()|0;
      $('#zoomedto').attr('class', 'fill-white contain z' + zoom);
      if (boundingBox.isEnabled()) {
        window.exporter.model.get('coordinates').zoom = zoom;
        $('#zoom').html(zoom);
        calcTotal();
      }
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

  // Refresh map baselayer.
  if (baselayer) map.removeLayer(baselayer);
  baselayer =  baselayer && this.model.get('_prefs').baselayer && this.model.get('_prefs').baselayer === baselayer._tilejson.id ? baselayer : this.model.get('_prefs').baselayer ? L.mapbox.tileLayer(this.model.get('_prefs').baselayer) : false;
  if (baselayer && window.location.hash === '#baselayer') {
    $('.base-toggle').addClass('active');
    baselayer.addTo(map);
  }

  // Refresh map layer.
  if (exporter.model.get('_prefs').print) var scale = '@4x';
  else if (window.devicePixelRatio > 1) var scale = '@2x';
  else var scale = '';

  if (tiles) map.removeLayer(tiles);
  tiles = L.mapbox.tileLayer({
    tiles: ['/style/{z}/{x}/{y}'+scale+'.png?id=' + this.model.id + '&' + mtime ],
    minzoom: this.model.get('minzoom'),
    maxzoom: this.model.get('maxzoom')
  })
  .addOneTimeEventListener('load', this.bboxEnable.bind(this))
  .on('load', errorHandler);
  tiles.addTo(map);

  // Refresh map title.tm.db.rm('user');
  $('title').text(this.model.get('name'));
  $('.js-name').text(this.model.get('name') || 'Untitled');
  $('.proj-active .style-name').text(this.model.get('name') || 'Untitled');

  // Set canvas background color.
  if (this.model.get('background')) {
    $('#map').css({'background-color':this.model.get('background')});
  }
  this.imageSizeStats();

  return false;
};

window.exporter = new Printer({
  el: document.body,
  model: new Style(style)
});
window.exporter.refresh();

// A few :target events need supplemental JS action. Handled here.
window.onhashchange = function(ev) {
  switch (ev.newURL.split('#').pop()) {
  case 'start':
    window.exporter.refresh();
    setTimeout(map.invalidateSize, 200);
    break;
  case 'home':
  case 'baselayer':
    window.exporter.refresh();
    break;
  }
};

window.onhashchange({
  oldURL:window.location.toString(),
  newURL:window.location.toString()
});

};
