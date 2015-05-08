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

(function() {

// test[tmp]=true => test tmp styles.
if (window.testParams.tmp) return testTmp();

tape('.js-mapCenter', function(t) {
    var z = (window.editor.map.getZoom());
    var x = (window.editor.map.getCenter().lng);
    var y = (window.editor.map.getCenter().lat);
    var xy = x.toFixed(4) + ', ' + y.toFixed(4);
    t.equal($('.js-mapCenter').text(),xy, '.js-mapCenter text: '+xy);
    t.equal($('#zoomedto').is('.zoom3'),true, '#zoomedto.zoom3');

    window.editor.map.setView([40,-40],6);
    t.equal($('.js-mapCenter').text(),'-40.0000, 40.0000', '.js-mapCenter text: -40.0000, 40.0000');
    t.equal($('#zoomedto').is('.zoom6'),true, '#zoomedto.zoom6');

    window.editor.map.setView([y,x],z);
    t.equal($('.js-mapCenter').text(),xy, '.js-mapCenter text: ' + xy);
    t.equal($('#zoomedto').is('.zoom3'),true, '#zoomedto.zoom3');
    t.end();
});

tape('.js-lockCenter unlocked', function(t) {
    var z = (window.editor.map.getZoom());
    var x = (window.editor.map.getCenter().lng);
    var y = (window.editor.map.getCenter().lat);
    var xyz = x.toFixed(4) + ',' + y.toFixed(4) + ',' + z;
    t.equal($('.js-savedCenter').text(), xyz, '.js-savedCenter text: ' + xyz);
    t.equal($('.js-lockCenter').is('.active'), false, '.js-lockCenter is unlocked');
    window.editor.map.setView([40,-40],6);
    t.equal($('.js-savedCenter').text(), '-40.0000,40.0000,6', '.js-savedCenter text: -40.0000,40.0000,6');
    window.editor.save();
    onajax(function() {
        t.deepEqual(window.editor.model.attributes.center,[-40,40,6],'saves center @ -40,40,6');
        window.editor.map.setView([y,x],z);
        t.equal($('.js-savedCenter').text(), xyz, '.js-savedCenter text: ' + xyz);
        window.editor.save();
        onajax(function() {
            t.deepEqual(window.editor.model.attributes.center,[x,y,z],'saves center @ ' + [x,y,z]);
            t.end();
        });
    });
});

tape('.js-lockCenter unlocked zoomrange', function(t) {
    var z = (window.editor.map.getZoom());
    var x = (window.editor.map.getCenter().lng);
    var y = (window.editor.map.getCenter().lat);
    var minzoom = $('#minzoom').prop('value');
    var xyz = x.toFixed(4) + ',' + y.toFixed(4) + ',' + z;
    t.equal($('.js-savedCenter').text(), xyz, '.js-savedCenter text: ' + xyz);
    t.equal($('.js-lockCenter').is('.active'), false, '.js-lockCenter is unlocked');
    window.editor.map.setView([40,-40],4);
    t.equal($('.js-savedCenter').text(), '-40.0000,40.0000,4', '.js-savedCenter text: -40.0000,40.0000,4');
    $('#minzoom').prop('value', 6);
    window.editor.save();
    onajax(a);
    function a() {
        t.ok(!hasModal('#error'));
        t.deepEqual(window.editor.model.attributes.minzoom,6,'saves minzoom @ 6');
        t.deepEqual(window.editor.model.attributes.center,[-40,40,6],'saves center @ -40,40,6');
        $('#minzoom').prop('value', minzoom);
        window.editor.save();
        onajax(b);
    }
    function b() {
        t.ok(!hasModal('#error'));
        window.editor.map.setView([y,x],z);
        t.equal($('.js-savedCenter').text(), xyz, '.js-savedCenter text: ' + xyz);
        window.editor.save();
        onajax(c);
    }
    function c() {
        t.ok(!hasModal('#error'));
        t.deepEqual(window.editor.model.attributes.center,[x,y,z],'saves center @ ' + [x,y,z]);
        t.end();
    }
});

tape('.js-lockCenter locked', function(t) {
    var z = (window.editor.map.getZoom());
    var x = (window.editor.map.getCenter().lng);
    var y = (window.editor.map.getCenter().lat);
    var xyz = x.toFixed(4) + ',' + y.toFixed(4) + ',' + z;
    t.equal($('.js-savedCenter').text(), xyz, '.js-savedCenter text: ' + xyz);
    t.equal($('.js-lockCenter').is('.active'), false, '.js-lockCenter is unlocked');
    t.ok(!$('body').hasClass('changed'), 'body');
    $('.js-lockCenter').click();
    t.ok($('body').hasClass('changed'), 'body.changed');
    t.equal($('.js-lockCenter').is('.active'), true, '.js-lockCenter is locked');
    window.editor.map.setView([40,-40],6);
    t.equal($('.js-savedCenter').text(), xyz, '.js-savedCenter text: ' + xyz);
    window.editor.save();
    onajax(function() {
        t.deepEqual(window.editor.model.attributes.center,[x,y,z],'saves center @ ' + [x,y,z]);
        window.editor.map.setView([y,x],z);
        $('.js-lockCenter').click();
        t.equal($('.js-lockCenter').is('.active'), false, '.js-lockCenter is unlocked');
        window.editor.save();
            onajax(function() {
            t.ok(!$('body').hasClass('changed'), 'body');
            t.end();
        });
    });
});

tape('.js-lockCenter locked zoomrange', function(t) {
    var z = (window.editor.map.getZoom());
    var x = (window.editor.map.getCenter().lng);
    var y = (window.editor.map.getCenter().lat);
    var minzoom = $('#minzoom').prop('value');
    var xyz = x.toFixed(4) + ',' + y.toFixed(4) + ',' + z;
    t.equal($('.js-savedCenter').text(), xyz, '.js-savedCenter text: ' + xyz);
    t.equal($('.js-lockCenter').is('.active'), false, '.js-lockCenter is unlocked');
    t.ok(!$('body').hasClass('changed'), 'body');
    $('.js-lockCenter').click();
    t.ok($('body').hasClass('changed'), 'body.changed');
    t.equal($('.js-lockCenter').is('.active'), true, '.js-lockCenter is locked');
    window.editor.map.setView([40,-40],4);
    t.equal($('.js-savedCenter').text(), xyz, '.js-savedCenter text: ' + xyz);
    $('#minzoom').prop('value', 6);
    window.editor.save();
    onajax(a);
    function a() {
        t.ok(hasModal('#error'), 'errors on center z outside min/maxzoom');
        $('#error a.js-close').click();
        $('#minzoom').prop('value', minzoom);
        window.editor.save();
        onajax(b);
    }
    function b() {
        t.ok(!hasModal('#error'));
        window.editor.map.setView([y,x],z);
        $('.js-lockCenter').click();
        t.equal($('.js-lockCenter').is('.active'), false, '.js-lockCenter is unlocked');
        window.editor.save();
        onajax(c);
    }
    function c() {
        t.ok(!hasModal('#error'));
        t.deepEqual(window.editor.model.attributes.center,[x,y,z],'saves center @ ' + [x,y,z]);
        t.ok(!$('body').hasClass('changed'), 'body');
        t.end();
    }
});

tape('#settings-form', function(t) {
    t.ok(!$('body').hasClass('changed'), 'body');
    $('#settings-drawer').change();
    t.ok($('body').hasClass('changed'), 'body.changed');
    t.end();
});

tape('.js-newproject => newproject modal', function(t) {
    t.equal(hasModal('#newproject'), false, 'no newproject modal');
    $('.js-newproject').click();
    t.equal(hasModal('#newproject'), true, 'shows newproject modal');
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
    t.equal($('[data-layer=10m-900913-bounding-box]').size(), 0, 'has no bbox layer');
    //Browse for file and add new shape layer
    $('.js-addlayer').click();
    $('.js-browsefile').click();
    var cwd = $('.js-printcwd').val();
    //This RegEx can probably be cleaned up, but it works for now
    var array = cwd.split(/[\s,]+/);
    var shpFile = array[0] + '/test/fixtures-local source/10m-900913-bounding-box.shp';
    $('#browsefile .col8').val(shpFile);
    $('#browsefile .col4').submit();
    onajax(function() {
        t.equal($('[data-layer=10m-900913-bounding-box]').size(), 1, 'has bbox layer');
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

    var targetPane = $('.pane.target').attr('id');
    var newBufferTarget = $('#hey-buffer-size-val');

    t.equal(targetPane,'layers-hey');
    t.equal(expectedBuffer, newBufferTarget.text());
    $('#del-hey').click();
    $('#confirm a.js-confirm').click();
    onajax(function() {
        t.end();
    });
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
    onajax(afterOmnivore1);
    onajax(afterUpdate1);
    onajax(afterOmnivore2);
    onajax(afterDelete);

    function afterOmnivore1() {
        t.ok(!hasModal('#error'), 'no errors');
    }

    function afterUpdate1() {
        t.ok(!hasModal('#error'), 'no errors');
        t.equal($('#layers-DCGIS_BusLineLn').size(), 1, 'adds #layers-DCGIS_BusLineLn form');
        $('#addlayer input[name=Datasource-file]').val(window.testParams.dataPath + '/geotiff/sample.tif');
        $('#addlayer').submit();
    }

    function afterOmnivore2() {
        t.equal($('#layers-sample').size(), 0, 'no #layers-sample form');

        t.ok(hasModal('#error'), 'shows error modal');
        $('#error a.js-close').click();
        t.ok(!hasModal('#error'), 'removes error modal');

        $('#del-DCGIS_BusLineLn').click();
        t.ok(hasModal('#confirm'), 'shows confirm modal');
        $('#confirm a.js-confirm').click();
    }

    function afterDelete() {
        t.equal($('#layers-DCGIS_BusLineLn').size(), 0, 'removes #layers-DCGIS_BusLineLn form');
        t.end();
    }
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
    'geojson/places.geo.json': {
        filepath: '/geojson/places.geo.json',
        expected: {
            'Datasource-file': window.testParams.dataPath + '/geojson/places.geo.json',
            'Datasource-layer': 'places.geo',
            'Datasource-type': 'geojson',
            'description': '',
            'id': 'places_geo',
            'properties-buffer-size': '8',
            'srs': '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs'
        }
    },
    'geojson/DC_polygon.geo.json': {
        filepath: '/geojson/DC_polygon.geo.json',
        expected: {
            'Datasource-file': window.testParams.dataPath + '/geojson/DC_polygon.geo.json',
            'Datasource-layer': 'DC_polygon.geo',
            'Datasource-type': 'geojson',
            'description': '',
            'id': 'DC_polygon_geo',
            'properties-buffer-size': '8',
            'srs': '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs'
        }
    },
    'topojson/topo.json': {
        filepath: '/topojson/topo.json',
        expected: {
            'Datasource-file': window.testParams.dataPath + '/topojson/topo.json',
            'Datasource-layer': 'topo',
            'Datasource-type': 'topojson',
            'description': '',
            'id': 'topo',
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

tape('Drag and drop layer ', function(t) {
    t.equal($('body.changed').size(), 1);
    t.equal($('#full.loading').size(), 0);
    $('.js-save').click();
    onajax(function() {
        t.equal($('body.changed').size(), 0);
        var layer1 = $('.js-layer:first-child');
        layer1.trigger('sortupdate');
        t.equal($('body.changed').size(), 1, ' triggers changed function');
        t.equal($('#full.loading').size(), 1, ' triggers update function');
        t.end();
    })
});

tape('Clear layers', function(t) {
    //Delete old layers from yml
    $('#del-box').click();
    $('#confirm a.js-confirm').click();
    onajax(function() {
        $('#del-solid').click();
        $('#confirm a.js-confirm').click();
        onajax(function() {
            t.end();
        });
    });
});

for (var name in datatests) (function(name, info) {
    tape('data test: ' + name, function(t) {
        var layerLength = $('.js-layer').length;
        if (layerLength > 0){
            //Delete all current layers to avoid raster/non-raster error message
            for(var i = 0; i < layerLength; i++){
                var layername;
                layername = $('.js-layer')[i].getAttribute('data-layer');
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
        t.equal($('#addlayer input[name=Datasource-file]').get(0).validity.valid, true);
        $('#addlayer').submit();

        var initialCenter = [
            window.editor.map.getCenter().lat,
            window.editor.map.getCenter().lng,
            window.editor.map.getZoom()
        ];

        onajax(afterOmnivore);
        onajax(afterUpdate);
        onajax(afterUpdate2);
        onajax(afterDelete);

        function afterOmnivore() {
            t.ok(!hasModal('#error'), 'no error');
        }

        function afterUpdate() {
            t.ok($('#layers-' + info.expected.id).hasClass('target'),'current layer pane is targeted');

            var newCenter = [
                window.editor.map.getCenter().lat,
                window.editor.map.getCenter().lng,
                window.editor.map.getZoom()
            ];

            t.notDeepEqual(newCenter, initialCenter, 'map re-centers on new layer');

            t.equal($('.pane.target').length,1,'only current layer pane is targeted');

            $('.js-tab.mode-fields').click();

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

            $('.pane.target .js-offpane').click();
        }

        function afterUpdate2() {
            $('#del-' + info.expected.id).click();
            t.ok(hasModal('#confirm'), 'shows confirm modal');
            $('#confirm a.js-confirm').click();
        }

        function afterDelete() {
            t.equal($('#layers-' + info.expected.id).size(), 0, 'removes #layers-' + info.expected.id + ' form');
            t.end();
        }
    });
})(name, datatests[name]);

tape('#addlayer: filename valid with spaces', function(t) {
    $('.js-addlayer').click();
    t.equal($('#addlayer').size(), 1, 'shows #addlayer modal');
    $('#addlayer input[name=Datasource-file]').val(window.testParams.dataPath + '/file with spaces.geojson');
    t.equal($('#addlayer input[name=Datasource-file]').get(0).validity.valid, true);
    $('#addlayer a.close').click();
    t.equal($('#addlayer').size(), 0, 'hides #addlayer modal');
    t.end();
});

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
    e.which = 220; // backslash
    $('body').trigger(e);
    t.equal(window.location.hash, '#settings', 'ctrl+\\ => #settings');

    t.end();
});

tape('keybindings refresh', function(t) {
    $('#settings-drawer input[name=name]').change();
    t.equal($('body').hasClass('changed'), true, 'body.changed');

    var e;
    e = $.Event('keydown');
    e.ctrlKey = true;
    e.which = 82; // r
    $('body').trigger(e);
    t.ok($('#full').hasClass('loading'), 'ctrl+space => #full.loading');
    onajax(function() {
        t.ok(!$('#full').hasClass('loading'), 'ctrl+s => #full');
        t.equal($('body').hasClass('changed'), true, 'body.changed (noop)');
        t.end();
    });
});

tape('keybindings save', function(t) {
    $('#settings-drawer input[name=name]').change();
    t.equal($('body').hasClass('changed'), true, 'body.changed');

    var e;
    e = $.Event('keydown');
    e.ctrlKey = true;
    e.which = 83; // s
    $('body').trigger(e);
    t.ok($('#full').hasClass('loading'), 'ctrl+s => #full.loading');
    onajax(function() {
        t.ok(!$('#full').hasClass('loading'), 'ctrl+s => #full');
        t.equal($('body').hasClass('changed'), false, 'ctrl+s => saved style');
        t.end();
    });
});

})();

function testTmp() {
    tape('tmp ctrl+s => Save As modal', function(t) {
        t.ok(!$('body').hasClass('changed'));
        var e;
        e = $.Event('keydown');
        e.ctrlKey = true;
        e.which = 83; // s
        $('body').trigger(e);
        t.equal(hasModal('#saveas'), true, '#saveas modal');
        t.end();
    });
}

