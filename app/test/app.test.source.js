'use strict';

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

function hasModal(selector) {
    return $('#modal-content ' + selector).size() > 0;
}

tape('#settings-form', function(t) {
    t.ok(!$('body').hasClass('changed'), 'body');
    $('#settings-drawer').change();
    t.ok($('body').hasClass('changed'), 'body.changed');
    t.end();
});

tape('.js-newstyle => newstyle modal', function(t) {
    t.equal(hasModal('#newstyle'), false, 'no newstyle modal');
    $('.js-newstyle').click();
    t.equal(hasModal('#newstyle'), true, 'shows newstyle modal');
    t.end();
});

tape('.js-sourcenewstyle => sourcenewstyle modal', function(t) {
    t.equal(hasModal('#sourcenewstyle'), false, 'no sourcenewstyle modal');
    $('.js-sourcenewstyle').click();
    t.equal(hasModal('#sourcenewstyle'), true, 'shows sourcenewstyle modal');
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
    t.equal($('#10m-900913-bounding-box').size(), 0, 'has no bbox layer');
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
        t.equal($('#10m-900913-bounding-box').size(), 1, 'has bbox layer');
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
    $('#del-hey').click();
    $('#confirm a.js-confirm').click();
    t.end();
});

tape('#raster and nonraster mix error', function(t) {
    if (!window.testParams || !window.testParams.dataPath) {
        console.warn('WARNING: skipping test, window.testParams.dataPath required');
        return t.end();
    }
    $('.js-addlayer').click();
    t.equal($('#addlayer').size(), 1, 'shows #addlayer modal');
    $('#addlayer input[name=Datasource-file]').val(window.testParams.dataPath + '/shp/dc_bus_lines/DCGIS_BusLineLn.shp');
    $('#addlayer').submit();
    $('#addlayer input[name=Datasource-file]').val(window.testParams.dataPath + '/geotiff/sample.tif');
    $('#addlayer').submit();
    onajax(function() {
        t.ok(hasModal('#error'), 'shows error modal');
        $('#error a.js-close').click();
        $('#del-DCGIS_BusLineLn').click();
        $('#confirm a.js-confirm').click();
        t.end();
    });
});

var datatests = {
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

//Delete old layers from yml
$('#del-box').click();
$('#confirm a.js-confirm').click();
$('#del-solid').click();
$('#confirm a.js-confirm').click();

for (var name in datatests) (function(name, info) {
    tape('data test: ' + name, function(t) {
        var layerLength = $('.js-layer').length;
        if (layerLength > 0){
            //Delete all current layers to avoid raster/non-raster error message
            for(var i = 0; i < layerLength; i++){
                var layername;
                layername = $('.js-layer')[i].id;
                $('#del-' + layername).click();
                $('#confirm a.js-confirm').click();
            };
        };

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
            t.ok(hasModal('#confirm'), 'shows confirm modal');
            $('#confirm a.js-confirm').click();
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

