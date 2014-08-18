window.Print = function(options) {

var map = options.map;
var tiles = options.tiles;
var mtime = (+new Date).toString(36);
var limit = 20000;
var sm = new SphericalMercator();

var Printer = Backbone.View.extend({});
var Modal = new views.Modal({
  el: $('.modal-content'),
  templates: templates
});

Printer.boundingBox;

var Style = options.style;
var Source = options.source;

Printer.prototype.events = {
  'click .js-info': 'toggleInfo',
  'click .js-reselect': 'bboxReselect',
  'click .js-recenter': 'bboxRecenter',
  'click .js-zoomedto': 'toggleStats',
  'change #resolution': 'calculateTotal',
  'change #format': 'updateformat',
  'change .js-dimensions': 'modifydimensions',
  'change .js-coordinates': 'modifycoordinates',
  'change #lock': 'lockdimensions'
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

Printer.prototype.bboxEnable = function(ev) {
  if (!this.boundingBox._enabled) {
    // if coordinates are saved in the model, use those.
    // otherwise, start over.
    if (window.exporter.model && window.exporter.model.get('coordinates')){
      window.exporter.boundingBox.enable();
      var locked = $('input[id=lock]:checked')[0] ? true : false;
      if (locked) this.lockdimensions();
    } else {
      this.calculateBounds();
      window.exporter.boundingBox.enable();
    }
    // Enable the location filter
    window.exporter.boundingBox.enable();
    window.exporter.boundingBox.fire('enableClick');
    $('#exportDownload').removeClass('disabled');
  }
};

Printer.prototype.bboxReselect = function() {
  if (!this.boundingBox._enabled) return;
  map.zoomOut();
  this.calculateBounds();
};

Printer.prototype.bboxRecenter = function() {
  if (!this.boundingBox._enabled) return;
  var coordinates = window.exporter.model.get('coordinates');
  var center = map.getCenter(),
    zoom = map.getZoom(),
    scale = coordinates.scale;

  if (coordinates.locked) {
    center = sm.px([center.lng, center.lat], zoom);
    var w = coordinates.dimensions[0],
      h = coordinates.dimensions[1],
      bounds = this.calculateCornersPx(center, w/scale, h/scale);
  } else {
    var bounds = this.calculateCornersLl([center.lat, center.lng], coordinates.bbox);
  }
  this.boundingBox.setBounds(bounds);

};

Printer.prototype.calculateBounds = function() {
  // when bounding box is reset to current viewport,
  // calculate the new dimensions of the bbox to the
  // visible viewport, not actual (covered by settings pane)

  // offset maintains access to bbox controls
  var sidebar = $('#full').width();
  var offset = 20;
  var bounds = map.getBounds(),
    zoom = map.getZoom(),
    ne = sm.px([bounds._northEast.lng, bounds._northEast.lat], zoom),
    sw = sm.px([bounds._southWest.lng, bounds._southWest.lat], zoom),
    center = [(ne[0] - sw[0])/2 + sw[0], (ne[1] - sw[1])/2 + sw[1]];

  bounds = this.calculateCornersPx(center, sidebar - offset, Math.abs(ne[1] - sw[1]) - offset);
  this.boundingBox.setBounds(bounds);
};

Printer.prototype.calculateCoordinates = function(ev) {
  // calculate bounding box dimensions and center point in lat,lng.
  // update model with new coordinates.
  var bounds = this.boundingBox.getBounds(),
    center = [(bounds._northEast.lat - bounds._southWest.lat)/2 + bounds._southWest.lat, (bounds._northEast.lng - bounds._southWest.lng)/2 + bounds._southWest.lng],
    decimals = 4,
    format = $('input[name=format]:checked').prop('value');

  var dimensions = window.exporter.model.get('coordinates') ?  window.exporter.model.get('coordinates').dimensions : [0, 0];
  var locked = window.exporter.model.get('coordinates') ?  window.exporter.model.get('coordinates').locked : false;

  window.exporter.model.set({
    coordinates: {
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
      ],
      dimensions: dimensions,
      locked: locked
    }
  });
  var coordinates = window.exporter.model.get('coordinates');

  $('#bboxInputW').prop('value', coordinates.bbox[0]);
  $('#bboxInputS').prop('value', coordinates.bbox[1]);
  $('#bboxInputE').prop('value', coordinates.bbox[2]);
  $('#bboxInputN').prop('value', coordinates.bbox[3]);
  $('#centerInputLat').prop('value', coordinates.center[0]);
  $('#centerInputLng').prop('value', coordinates.center[1]);
  this.calculateTotal();
};

Printer.prototype.calculateTotal = function(ev) {
  // Calculate bounding box dimensions in pixel and inch values and update field values.
  if (!this.boundingBox.isEnabled()) return;
  var scale = $('input[name=resolution]:checked').prop('value'),
    zoom = map.getZoom(),
    bbox = this.model.get('coordinates').bbox,
    center;
  sm.size = scale * 256;

  this.model.get('coordinates').scale = scale;

  var ne = sm.px([bbox[2], bbox[3]], zoom),
    sw = sm.px([bbox[0], bbox[1]], zoom),
    w = parseInt((ne[0] - sw[0]) * scale),
    h = parseInt((sw[1] - ne[1]) * scale),
    percentage = ( w > h ) ? Math.ceil((w / limit) * 100) : Math.ceil((h / limit) * 100);

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
  if (percentage > 100 ) $('#exportDownload').addClass('disabled').removeAttr('href');
  if (percentage <= 100 ) {
    $('#exportDownload').removeClass('disabled');
    this.updateurl();
  }

  // if the dimensions are locked, don't update dimension values.
  if (this.model.get('coordinates').locked) {
    if (ev && ev.target.name === 'resolution') {
      $('#pixelX').prop('value', w);
      $('#pixelY').prop('value', h);
      this.model.get('coordinates').dimensions = [w, h];
    }
    this.imageSizeStats();
    return;
  }

  this.model.get('coordinates').dimensions = [w, h];

  $('#pixelX').prop('value', w);
  $('#pixelY').prop('value', h);

  $('#inchX').prop('value', (w / (scale * 72)).toFixed(2));
  $('#inchY').prop('value', (h / (scale * 72)).toFixed(2));

  this.imageSizeStats();
};

Printer.prototype.modifycoordinates = function(ev) {
  // if the coordinates in 'bounds' or 'center' are modified,
  // compare and recalculate bounding box values.
  var bounds = [
      parseFloat($('#bboxInputW').prop('value')) || 0,
      parseFloat($('#bboxInputS').prop('value')) || 0,
      parseFloat($('#bboxInputE').prop('value')) || 0,
      parseFloat($('#bboxInputN').prop('value')) || 0
    ],
    center = [
      parseFloat($('#centerInputLat').prop('value')) || 0,
      parseFloat($('#centerInputLng').prop('value')) || 0
    ],
    bSum = bounds.reduce(function(a, b){ return a + b; }),
    bboxSum = window.exporter.model.get('coordinates').bbox.reduce(function(a, b){ return a + b; });

  if (bSum != bboxSum) {
    this.boundingBox.setBounds(L.latLngBounds(L.latLng(bounds[1], bounds[0]), L.latLng(bounds[3], bounds[2])));
    center = [ (bounds[3] - bounds[1])/2 + bounds[1], (bounds[2] - bounds[0])/2 + bounds[0]];
    map.setView(center, map.getZoom());
    return;
  }
  var cSum = center.reduce(function(a, b){ return a + b; });
  var centerSum = window.exporter.model.get('coordinates').center.reduce(function(a, b){ return a + b; });
  if (cSum != centerSum) {
    this.boundingBox.setBounds(this.calculateCornersLl(center, bounds));
    map.setView([center[0], center[1]], map.getZoom());
    return;
  }
};

Printer.prototype.modifydimensions = function(ev) {
  // if pixel or inch dimensions are modified,
  // recalculate bounding box values in lat, lng for leaflet
  var pixelX = /\d+/.exec($('#pixelX').prop('value'))[0] | 0,
    pixelY = /\d+/.exec($('#pixelY').prop('value'))[0] | 0,
    inchX = parseFloat(/\d+\.?\d*/.exec($('#inchX').prop('value'))[0]).toFixed(2),
    inchY = parseFloat(/\d+\.?\d*/.exec($('#inchY').prop('value'))[0]).toFixed(2),
    bounds;

  var scale = window.exporter.model.get('coordinates').scale,
    zoom = map.getZoom(),
    dimensions = window.exporter.model.get('coordinates').dimensions,
    inchdim = [ (dimensions[0] / (scale * 72)).toFixed(2), (dimensions[1] / (scale * 72)).toFixed(2)];

  var center = [
    parseFloat($('#centerInputLat').prop('value')),
    parseFloat($('#centerInputLng').prop('value'))
  ],
  center = sm.px([center[1], center[0]], zoom);

  if (pixelX != dimensions[0] || pixelY != dimensions[1] || window.exporter.model.get('coordinates').locked) {
    bounds = this.calculateCornersPx(center, pixelX/scale, pixelY/scale);
  } else if (inchX != inchdim[0] || inchY != inchdim[1]) {
    bounds = this.calculateCornersPx(center, inchX * 72, inchY * 72);
  } else {
    return;
  }

  this.boundingBox.setBounds(bounds);
};

Printer.prototype.calculateCornersPx = function(center, w, h) {
  // calculate the ne and sw corners from pixel values
  var zoom = map.getZoom(),
    ne = sm.ll([center[0] + w/2, center[1] - h/2], zoom),
    sw = sm.ll([center[0] - w/2, center[1] + h/2], zoom);

  return L.latLngBounds(L.latLng(ne[1], ne[0]), L.latLng(sw[1], sw[0]));
};

Printer.prototype.calculateCornersLl = function(center, bounds) {
  // calculate new ne and sw corners from new center and prev latlng values
  var w = bounds[0] - bounds[2],
    h = bounds[3] - bounds[1];

  bounds = [center[1] - (w/2), center[0] - (h/2), center[1] + (w/2), center[0] + (h/2)];
  return L.latLngBounds(L.latLng(bounds[1], bounds[0]), L.latLng(bounds[3], bounds[2]));
};

Printer.prototype.lockdimensions = function (){
  var markers = ['_eastMarker', '_southMarker', '_westMarker', '_northMarker', '_neMarker', '_seMarker', '_swMarker', '_nwMarker'];
  var locked = $('input[id=lock]:checked')[0] ? true : false;
  if (locked) {
    markers.forEach(function(marker){
      window.exporter.boundingBox[marker].dragging.disable();
      L.DomUtil.addClass(window.exporter.boundingBox[marker]._icon, 'locked');
    });
    $('.js-dimensions').prop('disabled', true);
    $('.js-coordinates').prop('disabled', true);
    $('.js-reselect').prop('disabled', true);
    window.exporter.model.get('coordinates').locked = true;
    this.imageSizeStats();
  } else {
    markers.forEach(function(marker){
      window.exporter.boundingBox[marker].dragging.enable();
      L.DomUtil.removeClass(window.exporter.boundingBox[marker]._icon, 'locked');
    });
    $('.js-dimensions').prop('disabled', false);
    $('.js-coordinates').prop('disabled', false);
    $('.js-reselect').prop('disabled', false);
    window.exporter.model.get('coordinates').locked = false;
    this.calculateTotal();
  }
};

Printer.prototype.updateformat = function() {
  var format = $('input[name=format]:checked').prop('value');

  if (!this.boundingBox.isEnabled()) return;
  window.exporter.model.get('coordinates').format = format;
  window.exporter.model.get('coordinates').quality = (format === 'png') ? 256 : 100;
  this.updateurl();
};

Printer.prototype.updateurl = function() {
  // update the link for 'download static map'
  if (!this.boundingBox.isEnabled()) return;
  var coords = window.exporter.model.get('coordinates');
  var url = 'http://localhost:3000/static/' +
    map.getZoom() + '/' +
    coords.bbox.toString() +
    '@' + coords.scale + 'x' +
    '.' + coords.format +
    '?id='+window.exporter.model.get('id');

  $('#exportDownload').attr('href', url);
};

Printer.prototype.imageSizeStats = function() {
  /*
  Add percentage of image size limit based on
  current dimensions to chart in bottom corner of map.
  */
  var html = "<a href='#export' class='export js-zoomedto zoomedto-close inline pad1 quiet pin-bottomright icon close'></a>";

  var minZoom = window.exporter.model.get('minzoom'),
    maxZoom = window.exporter.model.get('maxzoom'),
    dimensions = window.exporter.model.get('coordinates').dimensions,
    w = dimensions[0],
    h = dimensions[1],
    zoom = map.getZoom(),
    perc;

  for (var z = 0; z < 23; z++) {
    if (z >= minZoom && z <= maxZoom && this.boundingBox.isEnabled()) {
      var zoomDiff = Math.abs(z - zoom);
      var greatest = ( w > h ) ? w : h;
      if (window.exporter.model.get('coordinates').locked) {
        perc = Math.ceil((greatest / limit) * 100);
      } else {
        if (z > zoom) perc = Math.ceil((greatest * 100 * Math.pow(2, zoomDiff)) / limit);
        if (z < zoom) perc = Math.ceil((greatest  * 100 * (1/Math.pow(2, zoomDiff))) / limit);
        if (z === zoom ) perc = Math.ceil((greatest / limit) * 100);
      }
    }
    html += [
      "<a href='#export' class='js-zoomedto export clip strong micro col12 zoom zoom",z,"'>",
      "<span class='col3 center strong keyline-right'>z",z,"</span>",
      perc ? "<span class='truncate col9 strong perc pad0x " : '',
      perc > 100 ? "warning'" : '',
      perc > 1000 ? "'> >1000%</span>" : perc ? "'>"+perc+"%</span>" : '',
      "</a>"
    ].join('');
  }
  html += [
      "<span class='clip export js-zoomedto strong micro col12 quiet zoom zoom23'>",
      "<p class='truncate col12 pad1x'>% of image size limit</p>",
      "</span>"
    ].join('');
  $('#zoomedto').html(html);
};

Printer.prototype.toggleStats = function(ev) {
  if (ev.currentTarget.classList.contains('close')){
    $('#zoomedto').addClass('visible-n').removeClass('visible-y');
  } else {
    $('#zoomedto').addClass('visible-y').removeClass('visible-n');
  }
};

Printer.prototype.refresh = function(ev) {
  var calcTotal = _(this.calculateTotal).bind(this);
  var modifydimensions = _(this.modifydimensions).bind(this);

  if (!this.boundingBox){
    this.boundingBox = new L.LocationFilter().addTo(map);
    this.boundingBox.on('enabled', _(this.calculateCoordinates).bind(this));
    this.boundingBox.on('change', _(this.calculateCoordinates).bind(this));
  } else {
    this.boundingBox.addTo(map);
  }
  this.bboxEnable();

  map.on('zoomend', function() {
    var zoom = map.getZoom()|0;

    if (window.exporter.model.get('coordinates')) {
      $('#zoom').html(zoom);
      calcTotal();
      if (window.exporter.model.get('coordinates').locked) modifydimensions();
    }
  });

  map.options.minZoom = this.model.get('minzoom');
  map.options.maxZoom = this.model.get('maxzoom');

  return false;
};

return Printer;

};
