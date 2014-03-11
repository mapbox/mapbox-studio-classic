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

    describe('Tab creation', function() {
        beforeEach(function() {
            event = document.createEvent('HTMLEvents');
        });

        it('should create a new tab', function() {
            var el = document.getElementById('addtab');
            var value = document.getElementById('addtab-filename').value = 'foo';
            event.initEvent('submit', true, false);
            el.dispatchEvent(event);
            var tab = document.getElementById('tabs').getElementsByClassName('js-tab');
            expect(tab[tab.length - 1].rel).to.equal('foo.mss');
        });

        it('should reject file formats in the filename', function() {
            var el = document.getElementById('addtab');
            var value = document.getElementById('addtab-filename').value = 'foo.mss';
            event.initEvent('submit', true, false);
            el.dispatchEvent(event);
            var tab = document.getElementById('tabs').getElementsByClassName('js-tab');
            expect(tab[tab.length - 1].rel).to.equal('foo.mss');
        });
    });
});

describe('Layers', function() {
    it('should open layer descriptions');
});

describe('Documentation', function() {
    it('should tab through help topics')
});

mocha.ignoreLeaks();

if (window.mochaPhantomJS) {
    mochaPhantomJS.run();
} else {
    mocha.run();
}
