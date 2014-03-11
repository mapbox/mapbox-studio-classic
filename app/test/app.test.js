'use strict';

var expect = chai.expect;
var event, el;
mocha.setup('bdd');

// Override window.confirm for the test runner.
window.confirm = function(message) { return true; };

describe('Code editor', function() {
    beforeEach(function() {
        event = document.createEvent('HTMLEvents');
    });

    it('should delete a tab', function() {
        el = document.getElementsByClassName('js-deltab');
        event.initEvent('click', true, false);
        el[0].dispatchEvent(event);
        expect(el[0]).to.be.undefined;
    });

    describe('Tab creation', function() {
        beforeEach(function() {
            event = document.createEvent('HTMLEvents');
            el = document.getElementById('addtab');
        });

        it('should create a new tab', function() {
            var value = document.getElementById('addtab-filename').value = 'foo';
            event.initEvent('submit', true, false);
            el.dispatchEvent(event);
            var tab = document.getElementById('tabs').getElementsByClassName('js-tab');
            expect(tab[tab.length - 1].rel).to.equal('foo.mss');
        });

        it('should reject file formats in the filename', function() {
            var value = document.getElementById('addtab-filename').value = 'foo.mss';
            event.initEvent('submit', true, false);
            el.dispatchEvent(event);
            var tab = document.getElementById('tabs').getElementsByClassName('js-tab');
            expect(tab[tab.length - 1].rel).to.equal('foo.mss');
        });
    });
});

describe('Layers', function() {
    beforeEach(function() {
        event = document.createEvent('HTMLEvents');
    });

    it('should open layers description', function() {
        var el = document.getElementById('layers').getElementsByClassName('js-tab');
        event.initEvent('click', true, false);
        el[0].dispatchEvent(event);
        var isActive = el[0].getAttribute('class').match(/active/);
        expect(isActive).to.not.be.null;
    });
});

describe('Documentation', function() {
    beforeEach(function() {
        event = document.createEvent('HTMLEvents');
    });

    it('should tab through help topics', function() {
        var el = document.getElementById('docs').getElementsByClassName('js-tab');
        event.initEvent('click', true, false);
        var last = el[el.length - 1];
        last.dispatchEvent(event);
        var isActive = last.getAttribute('class').match(/active/);
        var docIsActive = document.getElementById(last.href.split('#')[1]).getAttribute('class').match(/active/);
        expect(isActive).to.not.be.null;
        expect(docIsActive).to.not.be.null;
    });
});

mocha.ignoreLeaks();

if (window.mochaPhantomJS) {
    mochaPhantomJS.run();
} else {
    mocha.run();
}
