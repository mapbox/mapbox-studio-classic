$(function() {

switch (window.location.hash) {
case '#darwin':
case '#linux':
case '#win32':
    break;
default:
    if (navigator.appVersion.indexOf('Win') != -1) {
        window.location.hash = '#win32';
    } else if (navigator.appVersion.indexOf('Mac') != -1) {
        window.location.hash = '#darwin';
    } else if (navigator.appVersion.indexOf('X11') != -1 || navigator.appVersion.indexOf('Linux') != -1) {
        window.location.hash = '#linux';
    } else {
        window.location.hash = '#darwin';
    }
    break;
}

});
