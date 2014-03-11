'use strict';

var expect = chai.expect;
var event;
mocha.setup('bdd');

// Override window.confirm for the test runner.
window.confirm = function(message) { return true; };

describe('Code editor', function() {
    beforeEach(function() {
        event = document.createEvent('HTMLEvents');
    });

    it('should delete a tab', function() {
        var el = document.getElementsByClassName('js-deltab');
        event.initEvent('click', true, false);
        el[0].dispatchEvent(event);
        expect(el[0]).to.be.undefined;
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
