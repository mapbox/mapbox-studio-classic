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
    var loadcheck = setTimeout(check, 100);

    function check(){
        if (window.exporter.model.attributes && window.exporter.model.attributes.coordinates) {
            clearTimeout(loadcheck);
            t.end();
        }
    };
});

tape('updates download url', function(t) {
    $('#bboxInputW').prop('value', -1.5);
    $('#bboxInputS').prop('value', -1.5);
    $('#bboxInputE').prop('value', 1.5);
    $('#bboxInputN').prop('value', 1.5);
    $('.js-coordinates').change();

    var href = document.getElementById('export').pathname;
    t.equal("/static/2/-1.5,-1.5,1.5,1.5@4.15625x.png", href)

    t.end();
});

