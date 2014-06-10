window.Print = function(templates, cwd, style) {

var map;
var baselayer;
var tiles;
var grids;
var gridc;
var templateEditor;
var boundingBox;
var mtime = (+new Date).toString(36);
var limit = 19008;
var sm = new SphericalMercator();

statHandler('drawtime')();

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
  'click .enable': 'bboxEnable',
  'click .reselect': 'bboxReselect',
  'click #redraw': 'modifyCoordinates',
  'change #resolution': 'updateScale',
  'change #format': 'updateFormat',
  'change #filename': 'updateUrl'
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
    // Enable the location filter
    boundingBox.enable();
    boundingBox.fire('enableClick');

    this.calculateBounds();

    $('#export').removeClass('disabled');
    $('.attributes').removeClass('quiet');
    $('#bboxInput').prop('disabled', false);
    $('#centerInput').prop('disabled', false);
    $('#bboxEnable').html('Reselect within current view').addClass('reselect').removeClass('enable')
  }
};

Printer.prototype.bboxReselect = function(){
  if (!boundingBox._enabled) return;
  this.calculateBounds();
  map.zoomOut();
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
  var bounds = boundingBox.getBounds();
  var center = [(bounds._northEast.lng - bounds._southWest.lng)/2 + bounds._southWest.lng, (bounds._northEast.lat - bounds._southWest.lat)/2 + bounds._southWest.lat];
  var zoom = map.getZoom();
  var decimals = 4;
  var format = $('input[name=format]:checked').prop('value');

  window.exporter.model.set({
    coordinates: {
      zoom: zoom,
      scale: $('input[name=resolution]:checked').prop('value'),
      format: format,
      quality: (format === 'png') ? 256 : 100,
      bbox: [
        parseFloat(bounds._southWest.lat.toFixed(decimals)),
        parseFloat(bounds._southWest.lng.toFixed(decimals)),
        parseFloat(bounds._northEast.lat.toFixed(decimals)),
        parseFloat(bounds._northEast.lng.toFixed(decimals))
      ],
      center: [
        center[0].toFixed(decimals),
        center[1].toFixed(decimals)
      ]
    }
  });
  var coordinates = window.exporter.model.get('coordinates');
  if ($('#redraw').hasClass('disabled')) $('#redraw').removeClass('disabled');
  $('#bboxInput').prop('value', coordinates.bbox[0]+','+coordinates.bbox[1]+','+coordinates.bbox[2]+','+coordinates.bbox[3]);
  $('#centerInput').prop('value', coordinates.center[0]+','+coordinates.center[1]);

  this.calculateTotal();
};

Printer.prototype.calculateTotal = function(){
  var scale = $('input[name=resolution]:checked').prop('value'),
    zoom = map.getZoom(),
    bbox = window.exporter.model.get('coordinates').bbox,
    center;
  sm.size = scale * 256;
  
  var topRight = sm.px([bbox[3], bbox[2]], zoom),
    bottomLeft = sm.px([bbox[1], bbox[0]], zoom),
    w = (topRight[0] - bottomLeft[0]) * scale,
    h = (bottomLeft[1] - topRight[1]) * scale,
    percentage = ( w > h ) ? ((w / limit) * 100) | 0 : ((h / limit) * 100) | 0;

  $('#dimX').html(w);
  $('#dimY').html(h);
  $('#sizePerc').html(percentage);
  if (percentage > 100 ) $('#export').addClass('disabled');
  if (percentage <= 100 ) $('#export').removeClass('disabled');
  this.updateUrl();
};

Printer.prototype.modifyCoordinates = function(ev){
  var bounds = $('#bboxInput').prop('value').split(',').map(parseFloat);
  var center = $('#centerInput').prop('value').split(',').map(parseFloat);
  var bSum = bounds.reduce(function(a, b){ return a + b; });
  var bboxSum = window.exporter.model.get('coordinates').bbox.reduce(function(a, b){ return a + b; });
  if (bSum != bboxSum) {
    boundingBox.setBounds(L.latLngBounds(L.latLng(bounds[0], bounds[1]), L.latLng(bounds[2], bounds[3])));
    center = [(bounds[2] - bounds[0])/2 + bounds[0], (bounds[3] - bounds[1])/2 + bounds[1]];
    map.setView(center, window.exporter.model.get('coordinates').zoom);
    return;
  }
  var cSum = center.reduce(function(a, b){ return a + b; });
  var centerSum = window.exporter.model.get('coordinates').center.reduce(function(a, b){ return a + b; });
  if (cSum != centerSum) {
    var h = bounds[3] - bounds[1];
    var w = bounds[0] - bounds[2];
    bounds = [center[1] - (w/2), center[0] - (h/2), center[1] + (w/2), center[0] + (h/2)];
    boundingBox.setBounds(L.latLngBounds(L.latLng(bounds[0], bounds[1]), L.latLng(bounds[2], bounds[3])));
    map.setView([center[1], center[0]], window.exporter.model.get('coordinates').zoom);
    return;
  }
};

Printer.prototype.updateScale = function(ev){
  var scale =  $('input[name=resolution]:checked').prop('value');

  if (!boundingBox.isEnabled()) return;
  this.model.get('coordinates').scale = scale;
  this.calculateTotal();
};

Printer.prototype.updateFormat = function(){
  var format = $('input[name=format]:checked').prop('value');
  $('#format').html('.'+format);

  if (!boundingBox.isEnabled()) return;
  window.exporter.model.get('coordinates').format = format;
  window.exporter.model.get('coordinates').quality = (format === 'png') ? 256 : 100;
  this.updateUrl();
};

Printer.prototype.updateUrl = function(){
  if (!boundingBox.isEnabled()) return;
  var coords = window.exporter.model.get('coordinates');
  var filename = $('#filename').prop('value');
  var url = 'http://localhost:3000/static/'+coords.zoom+'/'+coords.bbox.toString()+'@'+coords.scale+'x'+'/'+filename+'.'+coords.format+'?id='+window.exporter.model.get('id');
  $('#export').attr('href', url);
};

Printer.prototype.refresh = function(ev) {
  var calcTotal = this.calculateTotal.bind(this);

  if (!map) {
    map = L.mapbox.map('map');
    map.setView([this.model.get('center')[1], this.model.get('center')[0]], this.model.get('center')[2]);
    map.on('zoomend', function() { 
      var zoom = map.getZoom()|0;
      $('#zoomedto').attr('class', 'contain z' + zoom);
      if (boundingBox.isEnabled()) {
        window.exporter.model.get('coordinates').zoom = zoom;
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
  
    boundingBox = new L.LocationFilter().addTo(map);
    boundingBox.on('enabled', this.calculateCoordinates.bind(this));
    boundingBox.on('change', this.calculateCoordinates.bind(this));
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
  .on('tileload', statHandler('drawtime'))
  .on('load', errorHandler);
  tiles.addTo(map);

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
  if (this.model.get('background')) {
    $('#map').css({'background-color':this.model.get('background')});
  }

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
