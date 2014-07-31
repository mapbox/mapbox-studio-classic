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

tape('#settings-form', function(t) {
    t.ok(!$('body').hasClass('changed'), 'body');
    $('#settings-drawer').change();
    t.ok($('body').hasClass('changed'), 'body.changed');
    t.end();
});

tape('Setting maxzoom: sets maxzoom to higher value than 6 (tests logic preference for higher maxzoom...see #addlayer-shape test)', function(t) {
    var maxzoomTarget = $('#settings-drawer #maxzoom');
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
    	var maxzoomTarget = $('#settings-drawer #maxzoom');
    	var maxzoom = maxzoomTarget.val();
    	var projTarget = $('.js-metadata-projection');
		var expectedValue = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over';
		t.equal(expectedValue, projTarget.val());
    	t.equal(maxzoom, '12');
    	t.end();
    });
});

tape('sets maxzoom', function(t) {
    var maxzoomTarget = $('#settings-drawer #maxzoom');
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

tape('bookmarks: saves', function(t) {
    // Ensure nothing in localstorage
    var bookmarkId = editor.model.get('id') + '.bookmarks';
    localStorage.removeItem(bookmarkId);

    // Add a bookmark
    $('#bookmark input[type=submit]').click();

    // Check that it is in localstorage
    var bookmarks = localStorage.getItem(bookmarkId);
    try { bookmarks = JSON.parse(bookmarks); }
    catch(err) { t.ifError(err); }
    t.equal(Object.keys(bookmarks).length, 1, 'bookmark was saved');

    // Check that the UI is populated correctly
    t.equal($('#bookmark-list').children().length, 1, 'bookmark appears in list');
    t.end();
});

tape('bookmarks: removes', function(t) {
    // Delete a bookmark
    $('.js-del-bookmark').click();

    // Is removed from localStorage
    var bookmarkId = editor.model.get('id') + '.bookmarks';
    t.equal(localStorage.getItem(bookmarkId), '{}', 'bookmark was removed');

    // Is removed from UI
    t.equal($('#bookmark-list').children().length, 0, 'bookmark not in list');
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
    'geotiff/sample.tif': {
        filepath: '/geotiff/sample.tif',
        expected: {
            'Datasource-file': window.testParams.dataPath + '/geotiff/sample.tif',
            'Datasource-type': 'gdal',
            'description': '',
            'id': 'sample',
            'properties-buffer-size': '0',
            'srs': '+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=23 +lon_0=-96 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
        }
    },
    'geotiff/DC_rgb.tif': {
        filepath: '/geotiff/DC_rgb.tif',
        expected: {
            'Datasource-file': window.testParams.dataPath + '/geotiff/DC_rgb.tif',
            'Datasource-type': 'gdal',
            'description': '',
            'id': 'DC_rgb',
            'properties-buffer-size': '0',
            'srs': '+proj=utm +zone=18 +datum=NAD83 +units=m +no_defs'
        }
    },
    'vrt/sample.vrt': {
        filepath: '/vrt/sample.vrt',
        expected: {
            'Datasource-file': window.testParams.dataPath + '/vrt/sample.vrt',
            'Datasource-type': 'gdal',
            'description': '',
            'id': 'sample',
            'properties-buffer-size': '0',
            'srs': '+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=23 +lon_0=-96 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
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
            'srs': /datum=NAD83/
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
            'srs': /ellps=GRS80/
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
            var values = _($('#layers-' + info.expected.id).serializeArray()).reduce(function(memo, field) {
                memo[field.name] = field.value;
                return memo;
            }, {});
            for (var k in info.expected) {
                if (info.expected[k] instanceof RegExp) {
                    t.ok(info.expected[k].test(values[k]), 'sets form value for ' + k);
                } else {
                    t.equal(values[k], info.expected[k], 'sets form value for ' + k);
                }
            }
            $('#del-' + info.expected.id).click();
            t.equal($('#layers-' + info.expected.id).size(), 0, 'removes #layers-' + info.expected.id + ' form');
            t.end();
        });
    });
})(name, datatests[name]);

tape('keybindings', function(t) {
    window.location.hash = '#';

    var e;
    e = $.Event('keydown');
    e.ctrlKey = true;
    e.which = 190; // .
    $('body').trigger(e);
    t.equal(window.location.hash, '#full', 'ctrl+. => #fullscreen');

    e = $.Event('keydown');
    e.ctrlKey = true;
    e.which = 72; // h
    $('body').trigger(e);
    t.equal(window.location.hash, '#docs', 'ctrl+h => #help');

    e = $.Event('keydown');
    e.ctrlKey = true;
    e.which = 220; // backslash
    $('body').trigger(e);
    t.equal(window.location.hash, '#settings', 'ctrl+\\ => #settings');

    e = $.Event('keydown');
    e.ctrlKey = true;
    e.which = 66; // backslash
    $('body').trigger(e);
    t.equal(window.location.hash, '#bookmark', 'ctrl+b => #bookmark');

    t.end();
});

