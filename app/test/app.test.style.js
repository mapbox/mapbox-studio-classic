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

function hasModal(selector) {
    return $('#modal-content ' + selector).size() > 0;
}

/*
TODO - https://github.com/mapbox/tm2/issues/203
beforeEach(function() {
    event = document.createEvent('HTMLEvents');
});

tape('saves a project', function() {
    el = document.getElementById('title').getElementsByClassName('js-save')[0];
    event.initEvent('click', true, false);
    el.dispatchEvent(event);

    var form = document.getElementById('saveas');
    form.getElementsByTagName('input')[1].value = 'foo.tm2';
    var submit = document.createEvent('HTMLEvents');
    submit.initEvent('submit', true, false);
    form.dispatchEvent(submit);
});
*/

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
    onajax(function() {
        t.equal(count - 1, $('#history-style .project').size());
        t.end();
    });
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

