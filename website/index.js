$(function() {

L.mapbox.accessToken = 'pk.eyJ1IjoibXNsZWUiLCJhIjoiclpiTWV5SSJ9.P_h8r37vD8jpIH1A6i1VRg';
var map = L.mapbox.map('map', 'examples.map-i87786ca', { 
		zoomControl: false 
	})
    .setView([40, -74.50], 9);

var xray = 'mapbox.mapbox-terrain-v1';
var xraysource = {
	"tiles": [window.mapbox_tileApi + "/v4/" + xray + ".json?access_token=" + window.mapbox_accessToken],
    "minzoom": 0,
    "maxzoom": 20
    };

var layer = L.mapbox.tileLayer('xraysource');

// Disable drag and zoom handlers.
map.dragging.disable();
map.touchZoom.disable();
map.doubleClickZoom.disable();
map.scrollWheelZoom.disable();

// Disable tap handler, if present.
if (map.tap) map.tap.disable();

layer.addTo(map);

/*
// allow access to .js xray view of mapbox maps
var xray = 'mapbox.mapbox-terrain-v1';

//var $container = $('#' + container).parent();
var xraysource = {
      "tiles": [window.mapbox_tileApi + "/v4/" + xray + "/{z}/{x}/{y}.png?access_token=" + window.mapbox_accessToken],
      "minzoom": 0,
      "maxzoom": 20
    };

var map = L.mapbox.map(container, undefined, {
    attributionControl:false
});
var xrayLayer = L.mapbox.tileLayer(xraysource);
// end xray access


// swipe layers
//L.mapbox.accessToken = 'pk.eyJ1IjoibXNsZWUiLCJhIjoiclpiTWV5SSJ9.P_h8r37vD8jpIH1A6i1VRg';
var map = L.mapbox.map('map');
L.mapbox.tileLayer('mapbox.mapbox-terrain-v1').addTo(map);

var overlay = L.mapbox.tileLayer('examples.map-i87786ca').addTo(map);
var range = document.getElementById('range');

function clip() {
  var nw = map.containerPointToLayerPoint([0, 0]),
      se = map.containerPointToLayerPoint(map.getSize()),
      clipX = nw.x + (se.x - nw.x) * range.value;

  overlay.getContainer().style.clip = 'rect(' + [nw.y, clipX, se.y, nw.x].join('px,') + 'px)';
}

range['oninput' in range ? 'oninput' : 'onchange'] = clip;
map.on('move', clip);
map.setView([49.434,-123.272], 7);

clip();
// end swipe layers
*/

// start computer type sniffer
switch (window.location.hash) {
case '#darwin':
case '#linux':
case '#win32':
case '#win64':
    break;
default:
    // see http://stackoverflow.com/a/6866569
    if ((navigator.appVersion.indexOf('Win') && navigator.userAgent.indexOf("WOW64") != -1) || navigator.userAgent.indexOf("Win64") != -1 ) {
        window.location.hash = '#win64';
    } else if (navigator.appVersion.indexOf('Win') != -1) {
        window.location.hash = '#win32';
    } else if (navigator.appVersion.indexOf('Mac') != -1) {
        window.location.hash = '#darwin';
    } else if (navigator.appVersion.indexOf('X11') != -1 || navigator.appVersion.indexOf('Linux') != -1) {
        window.location.hash = '#linux';
    } else {
        window.location.hash = '#darwin';
    }
    break;
}
// end computer type sniffer

});

