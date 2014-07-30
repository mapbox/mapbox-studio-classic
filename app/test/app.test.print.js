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


tape('initializes', function(t) {
    var loadcheck = setInterval(check, 100);
    function check(){
        if (window.exporter.model.attributes && window.exporter.model.attributes.coordinates) {
            clearInterval(loadcheck);
            t.ok(true, 'initializes');
            t.end();
        }
    }
});

tape('.js-coordinates recalculates center', function(t) {
    $('#bboxInputW').prop('value', -2.5);
    $('#bboxInputS').prop('value', -2.5);
    $('#bboxInputE').prop('value', 1.5);
    $('#bboxInputN').prop('value', 1.5);
    $('.js-coordinates').change();

    t.equal('-0.5000', $('#centerInputLat').val());
    t.equal('-0.5000', $('#centerInputLng').val());

    t.end();
});

tape('.js-dimensions updates #export url', function(t) {
    $('#pixelX').prop('value', 324);
    $('#pixelY').prop('value', 324);
    $('.js-dimensions').change();

    t.equal('1.08', $('#inchX').val());
    t.equal('1.08', $('#inchY').val());

    $('#centerInputLat').prop('value', 0);
    $('#centerInputLng').prop('value', 0);
    $('.js-coordinates').change();

    var href = document.getElementById('export').pathname;
    t.equal('/static/2/-13.703,-13.5739,13.703,13.5739@4.15625x.png', href);

    t.end();
});

tape('#format updates #export url', function(t) {
    $('#jpeg').prop('checked', 'checked');
    $('#png').prop('checked', null);
    $('#format').change();

    t.ok($('#export').attr('href').indexOf('jpeg') > -1, 'jpeg instead of png');

    t.end();
});

tape('#resolution updates #js-dimensions url', function(t) {
    var px = $('#pixelX').val();
    var py = $('#pixelY').val();
    var ix = $('#inchX').val();
    var iy = $('#inchY').val();

    $('#600ppi').prop('checked', 'checked');
    $('#300ppi').prop('checked', null);
    $('#resolution').change();

    t.equal(ix, $('#inchX').val());
    t.equal(iy, $('#inchY').val());
    t.equal(px * 2, $('#pixelX').val() | 0);
    t.equal(py * 2, $('#pixelY').val() | 0);

    t.end();
});

tape('.js-dimensions over limit triggers warning', function(t) {
    var zoom = $('#zoom').html();
    while (zoom < 8) {
        $('#zoom-in').click();
        zoom = $('#zoom').html();
    }

    $('#pixelX').prop('value', 24000);
    $('.js-dimensions').change();

    t.ok($('#pixelX').hasClass('warning'));
    t.ok($('#zoomedto .z8 .perc').hasClass('warning'));

    t.end();
});

