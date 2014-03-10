'use strict';

var assert = chai.assert;
mocha.setup('bdd');

function testStylePage() {}

describe('editor', function() {
    it('should trigger tab creation');
    it('should delete a tab');
    it('should reject file formats in the filename');
    it('should trigger layers pane');
    it('should expand to fullscreen');
    it('should open settings pane');
    it('should open layers pane');
});

describe('layers', function() {
    it('should open layer descriptions');
    it('should open the data pane');
});

describe('documentation', function() {
    it('should tab through help topics')
});

if (window.mochaPhantomJS) {
    mochaPhantomJS.run();
} else {
    console.log(mocha.run());
}
