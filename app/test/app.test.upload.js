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

tape('upload', function(t) {
    t.ok($('body').is('.task'), 'body classed for task mode');

    whileExporting();
    function whileExporting() {
        if ($('body').is('.task')) {
            var pct = parseInt($('h1.percent').text(),10);
            t.ok(typeof pct === 'number' && !isNaN(pct), 'pct is a number');
            t.ok(pct >= 0 && pct <= 100, 'pct between 0-100: ' + pct);
            t.ok($('.js-cancel').is(':visible'), 'cancel button is visible');
            onajax(whileExporting);
        } else if ($('body').is('.stat')) {
            var size = $('.stat .size').text();
            t.ok(/[0-9\.]+ kB/.test(size), 'upload complete, filesize shown: ' + size);
            t.ok($('a.button.stat.cloud').is(':visible'), 'data button is visible');
            t.ok($('a.refresh').is(':visible'), 'redo button is visible');
            t.end();
        }
    }
});
