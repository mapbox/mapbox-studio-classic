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

tape('.js-history browses sources', function(t) {
    $('.js-history .js-browsesource').click();
    t.ok(hasModal('#browsesource'));
    t.end();
});

tape('.js-history browses styles', function(t) {
    $('.js-history .js-browsestyle').click();
    t.ok(hasModal('#browsestyle'));
    t.end();
});

tape('.js-history removes history style', function(t) {
    var count = $('#history-style .project').size();
    $('.js-history .js-ref-delete:eq(0)').click();
    t.ok(hasModal('#confirm'), 'shows confirm modal');
    $('#confirm a.js-confirm').click();
    onajax(function() {
        t.equal(count - 1, $('#history-style .project').size());
        t.end();
    });
});

tape('.js-newstyle => newstyle modal', function(t) {
    t.equal(hasModal('#newstyle'), false, 'no newstyle modal');
    $('.js-newstyle').click();
    t.equal(hasModal('#newstyle'), true, 'shows newstyle modal');
    t.end();
});

tape('#style-ui creates a new tab', function(t) {
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
    onajax(function() {
        t.ok(hasModal('#modalsources'));
        $('#modalsources-remote .js-adddata:eq(0)').click();
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

tape('initializes export ui', function(t) {
    // for some reason clicking on .js-export doesn't
    // initialize the bounding box
    window.exporter.refresh();
    t.ok(window.exporter.boundingBox);
    t.end();
});

tape('places: list', function(t) {
    $('.js-places.js-toolbar-places').click();
    t.notEqual($('.js-places-list').children().size(), 0, 'is populated with places');
    t.end();
});

tape('places: search results', function(t) {
    $('.js-show-search').click();
    $('#places-dosearch').attr('value','osm data');
    $('.js-places-search').click();
    t.notEqual($('.js-places-list').children().length, 0, 'are in list');

    $('#places-dosearch').attr('value','testingemptystate');;
    $('.js-places-search').click();
    t.equal($('.js-places-list').children().length, 1, 'empty state appears');
    t.end();
});

// TODO: add geocoding support so these tests work
tape('bookmarks: save', function(t) {

    // Ensure nothing in localstorage
    localStorage.clear();

    var target = $('.js-add-bookmark');
    // Add a bookmark
    target.click();
    t.ok(target.hasClass('spinner'), 'button has spinner');

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
    t.ok($('#zoomedto .zoom8 .perc').hasClass('warning'));

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
        t.equal(/^test\.[0-9a-z]+$/.test($('.js-mapid').text()), true, 'has mapid');
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
    e.which = 72; // h
    $('body').trigger(e);
    t.equal(window.location.hash, '#docs', 'ctrl+h => #help');

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
    e.which = 66; // b
    $('body').trigger(e);
    t.equal(window.location.hash, '#bookmark', 'ctrl+b => #bookmark');

    e = $.Event('keydown');
    e.ctrlKey = true;
    e.which = 69; // e
    $('body').trigger(e);
    t.equal(window.location.hash, '#export', 'ctrl+e => #export');

    e = $.Event('keydown');
    e.ctrlKey = true;
    e.which = 80; // b
    $('body').trigger(e);
    t.equal(window.location.hash, '#places', 'ctrl+p => #places');

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

