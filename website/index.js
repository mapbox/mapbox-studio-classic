$(function() {

// start computer type sniffer
switch (window.location.hash) {
case '#darwin':
case '#linux':
case '#win32':
case '#win64':
    break;
default:
    // see http://stackoverflow.com/a/6866569
    if ((navigator.appVersion.indexOf('Win') && navigator.userAgent.indexOf("WOW64") != -1) || navigator.userAgent.indexOf("Win64") != -1 ) {
        window.location.hash = '#win64';
    } else if (navigator.appVersion.indexOf('Win') != -1) {
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
// end computer type sniffer

});

