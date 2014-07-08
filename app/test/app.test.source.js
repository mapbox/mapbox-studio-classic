'use strict';

// Override window methods for the test runner.
window.confirm = function(message) { return true; };

// Global queue for testing post-ajax request. Use by calling
//
// onajax(function() {
//   // run once after the next ajax request completes
// });
var _onajax = [];
function onajax(callback) {
    _onajax.push(callback);
}
$(document).ajaxComplete(function() {
    if (!_onajax.length) return;
    var callback = _onajax.shift();
    // This setTimeout prevents the onajax callback from being called
    // before the actual ajax call's success/error handlers are called.
    setTimeout(function() { callback(); }, 100);
});

tape('Setting maxzoom: sets maxzoom to higher value than 6 (tests logic preference for higher maxzoom...see #addlayer-shape test)', function(t) {
    var maxzoomTarget = $('.js-settings-form #maxzoom');
    maxzoomTarget.val(12);
    $('.js-save').submit();
    var maxzoom = maxzoomTarget.val();
    t.equal(maxzoom, '12');
    t.end();
});

tape('#addlayer-shape: adds new shapefile and checks input values', function(t) {
    //Browse for file and add new shape layer
    $('.js-addlayer').click();
    $('.js-browsefile').click();
    var cwd = $('div.cwd').text();
    //This RegEx can probably be cleaned up, but it works for now
    cwd = cwd.replace(/\s*$/,"");
    var array = cwd.split(/[\s,]+/);
    var shpFile = array[1] + '/test/fixtures-localsource/10m-900913-bounding-box.shp';
    $('#browsefile .col8').val(shpFile);
    $('#browsefile .col4').submit();
    onajax(function() {
    	var maxzoomTarget = $('.js-settings-form #maxzoom');
    	var maxzoom = maxzoomTarget.val();
    	var projTarget = $('.js-metadata-projection');
		var expectedValue = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over';
		t.equal(expectedValue, projTarget.val());
    	t.equal(maxzoom, '12');
    	t.end();
    });
});

tape('sets maxzoom', function(t) {
    var maxzoomTarget = $('.js-settings-form #maxzoom');
    maxzoomTarget.val(6);
    $('.js-save').submit();
    var maxzoom = maxzoomTarget.val();
    t.equal(maxzoom, '6');
    t.end();
});

tape('tests the projection input field is populated with the expected projection', function(t) {
	var projTarget = $('.js-metadata-projection');
	var expectedValue = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over';
	t.deepEqual(expectedValue, projTarget.val());
    t.end();
});

tape('#updatename-shape: updates the layer name and checks that input values and new layer modal are set', function(t) {
    //Set description of old layer
    $('.js-layer #10m-900913-bounding-box').click();
    $('#10m-900913-bounding-box-buffer-size').val('24');
    var expectedBuffer = $('#10m-900913-bounding-box-buffer-size').val();

    //Update layer name
    $('#updatename-10m-900913-bounding-box').click();
    $('#newLayername').val('hey');
    $('#updatename').submit();

    var currentUrl = window.location.toString();
    var newBufferTarget = $('#hey-buffer-size-val');

    t.equal(currentUrl.slice(-10),'layers-hey');
    t.equal(expectedBuffer, newBufferTarget.text());
    t.end();
});

var datatests = {
    'csv/bbl_current_csv': {
        filepath: '/csv/bbl_current_csv.csv',
        expected: {
            'Datasource-file': window.testParams.dataPath + '/csv/bbl_current_csv.csv',
            'Datasource-type': 'csv',
            'description': '',
            'id': 'bbl_current_csv',
            'properties-buffer-size': '8',
            'srs': '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs'
        }
    },
    'geojson/DC_polygon.geo.json': {
        filepath: '/geojson/DC_polygon.geo.json',
        expected: {
            'Datasource-file': window.testParams.dataPath + '/geojson/DC_polygon.geo.json',
            'Datasource-layer': 'OGRGeoJSON',
            'Datasource-type': 'ogr',
            'description': '',
            'id': 'OGRGeoJSON',
            'properties-buffer-size': '8',
            'srs': '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs'
        }
    },
    'geojson/places.geo.json': {
        filepath: '/geojson/places.geo.json',
        expected: {
            'Datasource-file': window.testParams.dataPath + '/geojson/places.geo.json',
            'Datasource-layer': 'OGRGeoJSON',
            'Datasource-type': 'ogr',
            'description': '',
            'id': 'OGRGeoJSON',
            'properties-buffer-size': '8',
            'srs': '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs'
        }
    },
    'shp/dc_bus_lines': {
        filepath: '/shp/dc_bus_lines/DCGIS_BusLineLn.shp',
        expected: {
            'Datasource-file': window.testParams.dataPath + '/shp/dc_bus_lines/DCGIS_BusLineLn.shp',
            'Datasource-type': 'shape',
            'description': '',
            'id': 'DCGIS_BusLineLn',
            'properties-buffer-size': '8',
            'srs': '+proj=lcc +lat_1=38.3 +lat_2=39.45 +lat_0=37.66666666666666 +lon_0=-77 +x_0=400000 +y_0=0 +datum=NAD83 +units=m +no_defs'
        }
    },
    'shp/chi_bike_routes': {
        filepath: '/shp/chi_bike_routes/chi_bike_routes.shp',
        expected: {
            'Datasource-file': window.testParams.dataPath + '/shp/chi_bike_routes/chi_bike_routes.shp',
            'Datasource-type': 'shape',
            'description': '',
            'id': 'chi_bike_routes',
            'properties-buffer-size': '8',
            'srs': '+proj=tmerc +lat_0=36.66666666666666 +lon_0=-88.33333333333333 +k=0.9999749999999999 +x_0=300000 +y_0=0 +ellps=GRS80 +units=us-ft +no_defs'
        }
    },
};

for (var name in datatests) (function(name, info) {
    tape('data test: ' + name, function(t) {
        if (!window.testParams || !window.testParams.dataPath) {
            console.warn('WARNING: skipping test, window.testParams.dataPath required');
            return t.end();
        }
        $('.js-addlayer').click();
        t.equal($('#addlayer').size(), 1, 'shows #addlayer modal');
        $('#addlayer input[name=Datasource-file]').val(window.testParams.dataPath + info.filepath);
        $('#addlayer').submit();
        onajax(function() {
            t.equal($('#layers-' + info.expected.id).size(), 1, 'adds #layers-' + info.expected.id + ' form');
            t.deepEqual(_($('#layers-' + info.expected.id).serializeArray()).reduce(function(memo, field) {
                memo[field.name] = field.value;
                return memo;
            }, {}), info.expected, 'sets form values for ' + info.expected.id);
            $('#del-' + info.expected.id).click();
            t.equal($('#layers-' + info.expected.id).size(), 0, 'removes #layers-' + info.expected.id + ' form');
            t.end();
        });
    });
})(name, datatests[name]);

