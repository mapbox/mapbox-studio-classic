'use strict';

var assert = chai.assert;
var expect = chai.expect;

mocha.setup('bdd');

function testStylePage() {}

describe('Code editor', function() {

    it('should delete a tab', function() {
        var el = document.getElementsByClassName('js-deltab');
        var event = document.createEvent('HTMLEvents');
        event.initEvent('click', false, false);
        el[0].dispatchEvent(event);
    });

    it('should trigger tab creation');
    it('should reject file formats in the filename');
    it('should trigger layers pane');
    it('should expand to fullscreen');
    it('should open settings pane');
    it('should open layers pane');
});

describe('Layer Panel', function() {
    it('should open layer descriptions');
    it('should open the data pane');
});

describe('Documentation Panel', function() {
    it('should tab through help topics')
});

mocha.ignoreLeaks();

if (window.mochaPhantomJS) {
    mochaPhantomJS.run();
} else {
    mocha.run();
}
