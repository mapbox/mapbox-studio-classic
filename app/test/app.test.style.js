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

// test[userlayers]=true => test style with user layer list.
if (window.testParams.userlayers) return testUserLayers();

// test[tmp]=true => test tmp styles.
if (window.testParams.tmp) return testTmp();

// test[fonts]=true => test font styles.
if (window.testParams.fonts) return testFonts();

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

tape('.js-history browses projects', function(t) {
    localStorage.clear();
    var path = cwd;
    t.ok(!hasModal('#browseproject'));
    $('.js-history .js-browseproject').click();

    t.ok(hasModal('#browseproject'));
    t.ok(localStorage.getItem('stylebrowseproject') === path, ' intial key/value in localstorage equals path.');

    onajax(function() {
        var destination = $('#browseproject .folder:eq(0)').attr('href').split('#').pop();
        // requires double click
        $('#browseproject .folder:eq(0)').click().click();
        onajax(function() {
            t.ok(localStorage.getItem('stylebrowseproject') === destination, ' new path saved to localstorage.');
            localStorage.clear();
            t.end();
        });
    });
});

tape('stylesheet error ', function(t) {
    t.ok(!$('[rel="style.mss"] .js-error-alert').length, ' not visible initially' );
    window.code["style.mss"].setValue('Map { backgroundcolor: #333; }');
    window.editor.update();
    onajax(function() {
        t.ok($('[rel="style.mss"] .js-error-alert').length, ' appears with faulty stylesheet');
        window.code["style.mss"].setValue('Map { background-color: #333; }');
        window.editor.update();
        onajax(function() {
            t.ok(!$('[rel="style.mss"] .js-error-alert').length, ' dismissed with good stylesheet');
            t.end();
        })
    })
});

tape('stylesheet search ', function(t) {
    t.ok(!$('.CodeMirror-dialog.active').length, ' is not active initially' );
    window.code["style.mss"].execCommand('find');
    t.ok($('.CodeMirror-dialog.active').length, ' is active after command' );

    t.ok(!$('.cm-searching').length, ' shows no results before initiated');

    window.code["style.mss"].openDialog().close();
    t.ok(!$('.CodeMirror-dialog.active').length, ' is closed after clicking close button' );

    t.end();
});

tape('stylesheet color ', function(t) {
    window.code["style.mss"].setValue('Map { background-color: #333; }#water { polygon-fill: #2200ff;}');
    t.equal($('.cm-palette-hint').length, 2, ' swatches are visible' );
    t.ok($('.sp-container').length, ' palettes exist' );

    $('.cm-palette-hint').eq(0).click();
    t.equal($('.sp-container:not(.sp-hidden)').length, 1, ' picker appears on click');

    $(' .sp-container:not(.sp-hidden) .sp-cancel').click();
    t.equal($('.sp-container:not(.sp-hidden)').length, 0, ' picker disappears when cancelled');

    t.end();
});

tape('.js-history removes history style', function(t) {
    var count = $('#history-style .history-project').size();
    $('.js-history .js-ref-delete:eq(0)').click();
    t.ok(hasModal('#confirm'), 'shows confirm modal');
    $('#confirm a.js-confirm').click();
    onajax(function() {
        t.equal(count - 1, $('#history-style .history-project').size());
        t.end();
    });
});

tape('.js-newproject => newproject modal', function(t) {
    t.equal(hasModal('#newproject'), false, 'no newproject modal');
    $('.js-newproject').click();
    t.equal(hasModal('#newproject'), true, 'shows newproject modal');
    t.end();
});

tape('#style-ui creates a new tab', function(t) {
    t.equal($('#tabs .js-tab:eq(0)').is('.active'), true, 'first tab is active');
    t.equal($('.CodeMirror:eq(0)').is('.active'), true, 'first CodeMirror is active');

    $('.js-addtab:eq(0)').click();
    t.ok(hasModal('form#addtab'));

    $('#addtab-filename').val('foo');
    $('#addtab').submit();

    // Submit removes modal.
    t.equal(0, $('#addtab-filename').size());

    // Automatically adds .mss extension.
    t.equal('foo.mss', $('#tabs .js-tab:last').attr('rel'));

    t.end();
});

tape('#style-ui clicks set tabs as active', function(t) {
    $('#tabs .js-tab:eq(1)').click();
    t.ok($('#tabs .js-tab:eq(1)').hasClass('active'));
    t.ok(!$('#tabs .js-tab:eq(0)').is('.active'));

    $('#tabs .js-tab:eq(0)').click();
    t.ok($('#tabs .js-tab:eq(0)').hasClass('active'));
    t.ok(!$('#tabs .js-tab:eq(1)').is('.active'));

    t.end();
});

tape('#style-ui keys set tabs as active', function(t) {
    var e;
    // ctrl+alt+1
    e = $.Event('keydown');
    e.which = ('1').charCodeAt(0);
    e.altKey = true;
    e.ctrlKey = true;
    $('body').trigger(e);
    t.ok($('#tabs .js-tab:eq(0)').hasClass('active'));
    t.ok(!$('#tabs .js-tab:eq(1)').is('.active'));

    // ctrl+alt+2
    e = $.Event('keydown');
    e.which = ('2').charCodeAt(0);
    e.altKey = true;
    e.ctrlKey = true;
    $('body').trigger(e);
    t.ok($('#tabs .js-tab:eq(1)').hasClass('active'));
    t.ok(!$('#tabs .js-tab:eq(0)').is('.active'));

    t.end();
});

tape('#style-ui deletes a tab', function(t) {
    var count = $('#tabs .js-tab').size();
    $('#tabs .js-deltab:eq(0)').click();
    t.ok(hasModal('#confirm'), 'shows confirm modal');
    $('#confirm a.js-confirm').click();
    t.equal(count - 1, $('#tabs .js-tab').size());
    t.end();
});

tape('#style-ui prevents duplicate extensions in filename', function(t) {
    $('.js-addtab:eq(0)').click();
    t.ok(hasModal('#addtab'));

    $('#addtab-filename').val('bar.mss');
    $('#addtab').submit();

    // Submit removes modal.
    t.ok(!hasModal('#addtab'));

    // Prevents duplicate .mss extension.
    t.equal('bar.mss', $('#tabs .js-tab:last').attr('rel'));

    t.end();
});

tape('#style-ui requires unique stylesheet name', function(t) {
    $('.js-addtab:eq(0)').click();
    t.ok(hasModal('form#addtab'));

    $('#addtab-filename').val('baz');
    $('#addtab').submit();

    $('.js-addtab:eq(0)').click();
    t.ok(hasModal('form#addtab'));

    $('#addtab-filename').val('baz');
    $('#addtab').submit();

    t.ok(hasModal('#error'));
    t.equal('Tab name must be different than existing tab "baz"', $('#error > pre').text());

    t.end();
});

tape('.js-layers opens layer description', function(t) {
    $('.js-layers .js-tab:eq(0)').click();
    t.ok($('.js-layers .js-tab:eq(0)').hasClass('active'));
    t.end();
});

tape('.js-layers shows sources modal', function(t) {
    $('.js-layers .js-modalsources:eq(0)').click();
    t.equal($('.js-layers .js-modalsources:eq(0)').hasClass('spinner'),true, ' has loading state');
    onajax(function() {
        t.equal($('.js-layers .js-modalsources:eq(0)').hasClass('spinner'),false, ' doesn\'t have loading state');
        t.ok(hasModal('#modalsources'));

        // form validity tests
        var $localinput = $('.js-localdata input[type=text]');
        var $remoteinput = $('.js-remotedata input[type=text]');

        $remoteinput.val('https://a.tiles.mapbox.com/v4/mapbox.mapbox-streets-v5.json');
        t.equal($remoteinput.get(0).validity.valid, true, ' remote form allows https tilejson source');

        $remoteinput.val('http://a.tiles.mapbox.com/v4/mapbox.mapbox-streets-v5.json');
        t.equal($remoteinput.get(0).validity.valid, true, ' remote form allows http tilejson source');

        $remoteinput.val('ssh://invalid/remote-source.git');
        t.equal($remoteinput.get(0).validity.valid, false, ' remote form disallows other protocols');

        $remoteinput.val('mapbox.mapbox-terrain-v1, mapbox.mapbox-streets-v5');
        t.equal($remoteinput.get(0).validity.valid, false, ' remote form disallows spaces between composite sources');

        $remoteinput.val('mapbox.mapbox-terrain-v1,mapbox.mapbox-streets-v5');
        t.equal($remoteinput.get(0).validity.valid, true, ' remote form allows remote composite sources');

        $remoteinput.val('tmsource:///Users/foo/bar.tm2source,mapbox.mapbox-streets-v5');
        t.equal($remoteinput.get(0).validity.valid, false,' remote form disallows local+remote compositing');

        $localinput.val('tmsource:///Users/foo/bar.tm2source,mapbox.mapbox-streets-v5');
        t.equal($localinput.get(0).validity.valid, false, ' local form disallows local+remote compositing');

        $localinput.val('tmsource:///Users/foo/bar.tm2source');
        t.equal($localinput.get(0).validity.valid, true, ' local form allows single local source');

        $localinput.val('tmsource://c:/Users/foo/bar.tm2source');
        t.equal($localinput.get(0).validity.valid, true, ' local form allow a local source with c:/ in source (win)');

        // now test the user clicking a real source
        $('#modalsources-remote .js-adddata:eq(0)').click();

        var selected = $('#modalsources-remote .js-adddata:eq(0)').attr('href');
        var val = $remoteinput.val();

        t.notEqual(selected.indexOf(val),-1,' and selected layer matches form input.');
        t.equal($remoteinput.get(0).validity.valid, true);

        $('.js-remotedata input[type=submit]').click();

        onajax(function() {
            t.ok(!hasModal('#modalsources'));
            t.end();
        });
    });
});

tape('#reference tabs through CartoCSS reference', function(t) {
    $('#reference .js-tab:last').click();
    var target = $('#' + $('#reference .js-tab:last').attr('href').split('#').pop());
    t.ok($('#reference .js-tab:last').hasClass('active'));
    t.ok(target.hasClass('active'));
    t.end();
});

tape('places: list', function(t) {
    window.location.hash = '#places';
    setTimeout(function() {
        t.notEqual($('.js-places-list').children().size(), 0, 'is populated with places');
        t.end();
    }, 100);
});

tape('places: tag filter', function(t) {
    $('.places-entry-container a[tag="road:main"]').click();
    var placeCount = $('.js-places-list').children().size();
    t.notEqual(placeCount, 0, 'updates places list');
    for (var i = 0; i<placeCount; i++) {
        var item = $('.js-places-list').children()[i];
        t.equal($('a[tag="road:main"]', item).size(), 1, 'item has 1 road:main tag');
    };
    t.end();
});

tape('places: search results', function(t) {
    t.equal($('.js-places-container').hasClass('active'), false, 'search bar is not active');
    $('.js-show-search').click();
    t.equal($('.js-places-container').hasClass('active'), true, 'search bar is active');
    // search should have no results
    $('#places-dosearch').val('testingemptystate');
    $('.js-places-search').click();
    t.equal($('.js-places-list').children().length, 1, 'empty state appears');
    // search for 'park' which is different than 'osm data'
    $('#places-dosearch').val('park');
    $('.js-places-search').click();
    // check search results
    var placeCount = $('.js-places-list').children().size();
    t.notEqual(placeCount, 0, 'are in list');
    for (var i = 0; i<placeCount; i++) {
        var item = $('.js-places-list').children()[i];
        var inName = $('small', item).text().toLowerCase().indexOf('park') >-1;
        var inTags = $('a[tag*="park"]', item).size() >=1;
        t.ok(inTags || inName, 'item has park in tags or name');
    };
    var placeItem = $('.js-places-list').children()[0];
    var jumpZoom = parseInt($('.js-places-entry', placeItem).attr('zoom'), 10);
    var jumpLat = parseFloat($('.js-places-entry', placeItem).attr('lat'));
    var jumpLng = parseFloat($('.js-places-entry', placeItem).attr('lng'));
    var originalZoom = (window.editor.map.getZoom());
    var originalLat = (window.editor.map.getCenter().lat);
    var originalLng = (window.editor.map.getCenter().lng);
    t.notEqual(jumpZoom, originalZoom, 'original zoom not equal to jump zoom');
    t.notEqual(jumpLat, originalLat, 'original lat not equal to jump lat');
    t.notEqual(jumpLng, originalLng, 'original lng not equal to jump lng');
    $('.js-place-jump', placeItem).click();
    t.equal(window.editor.map.getZoom(), jumpZoom, 'map is at jump zoom');
    t.equal(window.editor.map.getCenter().lat, jumpLat, 'map is at jump lat');
    t.equal(window.editor.map.getCenter().lng, jumpLng, 'map is at jump lng');
    window.editor.map.setView([originalLat, originalLng], originalZoom);
    t.end();
});

// TODO: add geocoding support so these tests work
tape('bookmarks: ', function(t) {

    var target = $('.js-add-bookmark');
    // Add a bookmark
    target.click();
    t.ok($('.places-button').hasClass('spinner'), 'button has spinner');

    onajax(function() {
//         // Check that it is stored
//         var bookmarks = JSON.parse(localStorage.getItem(editor.model.get('id') + '.bookmarks'));
//         t.equal(bookmarks.length, 1, 'bookmark is in localstorage');

//         // Check that the UI is populated correctly
//         $('.js-toolbar-places').click();
//         $('label[for="bookmarks"]').click();
//         t.equal($('.js-places-list').children().length, 1, 'bookmark appears in list');
           t.end();
    });

});

// tape('bookmarks: removes', function(t) {
//     // Delete a bookmark
//     $('.js-del-bookmark').click();

//     // Is removed from localStorage
//     var bookmarks = localStorage.getItem(editor.model.get('id') + '.bookmarks');
//     t.equal(bookmarks.length, 0, 'bookmark was deleted');

//     // Is removed from UI
//     $('.js-toolbar-places').click();
//     $('label[for="bookmarks"]').click();
//     t.equal($('#js-places-list').children().length, 0, 'bookmark is not in list');
//     t.end();
// });

tape('initializes export ui', function(t) {
    // for some reason clicking on .js-export doesn't
    // initialize the bounding box
    window.exporter.refresh();
    t.ok(window.exporter.boundingBox);
    t.end();
});

tape('export-ui: .js-coordinates recalculates center', function(t) {
    $('#bboxInputW').prop('value', -2.5);
    $('#bboxInputS').prop('value', -2.5);
    $('#bboxInputE').prop('value', 1.5);
    $('#bboxInputN').prop('value', 1.5);
    $('.js-coordinates').change();

    t.equal($('#centerInputLat').val(), '-0.5000');
    t.equal($('#centerInputLng').val(), '-0.5000');

    t.end();
});

tape('export-ui: .js-dimensions updates #exportDownload url', function(t) {
    $('#pixelX').prop('value', 324);
    $('#pixelY').prop('value', 324);
    $('.js-dimensions').change();

    t.equal($('#inchX').val(), '1.08');
    t.equal($('#inchY').val(), '1.08');

    $('#centerInputLat').prop('value', 0);
    $('#centerInputLng').prop('value', 0);
    $('.js-coordinates').change();

    var href = document.getElementById('exportDownload').pathname;
    t.equal(href, '/static/3/-6.8515,-6.835,6.8515,6.835@4.15625x.png');

    t.end();
});

tape('export-ui: #format updates #export url', function(t) {
    $('#jpeg').prop('checked', 'checked');
    $('#png').prop('checked', null);
    $('#format').change();

    t.ok($('#exportDownload').attr('href').indexOf('jpeg') > -1, 'jpeg instead of png');

    t.end();
});

tape('export-ui: #resolution updates #js-dimensions url', function(t) {
    var px = $('#pixelX').val();
    var py = $('#pixelY').val();
    var ix = $('#inchX').val();
    var iy = $('#inchY').val();

    $('#600ppi').prop('checked', 'checked');
    $('#300ppi').prop('checked', null);
    $('#resolution').change();

    t.equal($('#inchX').val(), ix);
    t.equal($('#inchY').val(), iy);
    t.equal($('#pixelX').val() | 0, px * 2);
    t.equal($('#pixelY').val() | 0, py * 2);

    t.end();
});

tape('export-ui: .js-dimensions over limit triggers warning', function(t) {
    var zoom = $('#zoom').html();
    while (zoom < 8) {
        $('#zoom-in').click();
        zoom = $('#zoom').html();
    }

    $('#pixelX').prop('value', 24000);
    $('.js-dimensions').change();

    t.ok($('#pixelX').hasClass('warning'));
    t.ok($('#zoomedto .zoom8').hasClass('warning'));

    t.end();
});

tape('.js-save', function(t) {
    t.equal($('.js-save').size(), 1, 'has .js-save button');
    $('.js-save').click();
    t.equal($('#full').hasClass('loading'), true, '.js-save => #full.loading');
    onajax(function() {
        t.equal(!$('#full').hasClass('loading'), true, '.js-save => #full');
        t.equal($('body').hasClass('changed'), false, '.js-save => saved style');
        t.end();
    });
});

tape('.js-upload', function(t) {
    t.equal($('.js-upload').size(), 1, 'has .js-upload button');
    t.equal(/^test\.[0-9a-z]+$/.test($('.js-mapid').text()), false, 'no mapid');
    t.equal($('#mapstatus').hasClass('loading'), false, '#mapstatus');
    $('.js-upload').click();
    t.equal($('#mapstatus').hasClass('loading'), true, '#mapstatus.loading');
    onajax(function() {
        t.equal(/^test\.[0-9a-z]+$/.test(window.editor.model.get('_prefs').mapid), true, 'model has mapid');
        t.equal(/^test\.[0-9a-z]+$/.test($('.js-mapid').text()), true, 'UI has mapid');
        t.equal($('#mapstatus').hasClass('loading'), false, '#mapstatus');
        t.end();
    });
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
    e.which = 191; // /
    $('body').trigger(e);
    t.equal(window.location.hash, '#docs', 'ctrl+/ => #help');

    e = $.Event('keydown');
    e.ctrlKey = true;
    e.which = 73; // i
    $('body').trigger(e);
    t.equal(window.location.hash, '#layers', 'ctrl+i => #layers');

    e = $.Event('keydown');
    e.ctrlKey = true;
    e.which = 220; // backslash
    $('body').trigger(e);
    t.equal(window.location.hash, '#settings', 'ctrl+\\ => #settings');

    e = $.Event('keydown');
    e.ctrlKey = true;
    e.which = 80; // b
    $('body').trigger(e);
    t.equal(window.location.hash, '#places', 'ctrl+p => #places');

    e = $.Event('keydown');
    e.ctrlKey = true;
    e.altKey = true; // alt
    e.which = 83; // s
    $('body').trigger(e);
    t.equal(window.location.hash, '#export', 'ctrl+alt+s => #export');

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

tape('keybindings bookmark', function(t) {
    var e;
    e = $.Event('keydown');
    e.ctrlKey = true;
    e.which = 66; // b
    $('body').trigger(e);
    t.ok($('.js-places-button').hasClass('spinner'), 'ctrl+b => #add-bookmark.spinner');
    onajax(function() {
        t.end();
    });
});

})();

function testUserLayers() {
    tape('user layers', function(t) {
        var html;

        t.equal(/Source locked/.test($('#layers-drawer').html()), true, 'adds "Source locked" disabled mask');
        t.equal($('.layer').size(), 4, 'shows entries from user layer list');

        html = $('.layer:eq(0)').html();
        t.equal(/#landuse/.test(html), true, '#landuse');
        t.equal(/One of: cemetery, hospital/.test(html), true, '#landuse description');

        html = $('.layer:eq(1)').html();
        t.equal(/#water\.class2/.test(html), true, '#water.class2');
        t.equal(/Unique OSM ID number/.test(html), true, '#water.class2 description');

        html = $('.layer:eq(2)').html();
        t.equal(/#water\.class1/.test(html), true, '#water.class1');
        t.equal(/Unique OSM ID number/.test(html), true, '#water.class1 description');

        html = $('.layer:eq(3)').html();
        t.equal(/#water/.test(html), true, '#water');
        t.equal(/Unique OSM ID number/.test(html), true, '#water description');

        t.end();
    });
}

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


function testFonts() {
    tape('Custom fonts in list', function(t) {
        t.ok($('.js-userfonts input:first-of-type').attr('value','Comic Neue Oblique'), true, ' includes correct fonts');
        t.end();
    });
}
