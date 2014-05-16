'use strict';

var assert = chai.assert;

var event = function(type, bubbles, cancelable) {
    var ev = document.createEvent('HTMLEvents');
    ev.initEvent(type, bubbles, cancelable);
    return ev;
};

mocha.setup('bdd');

// Override window methods for the test runner.
window.confirm = function(message) { return true; };

/*
TODO - https://github.com/mapbox/tm2/issues/203
beforeEach(function() {
    event = document.createEvent('HTMLEvents');
});

it('saves a project', function() {
    el = document.getElementById('title').getElementsByClassName('js-save')[0];
    event.initEvent('click', true, false);
    el.dispatchEvent(event);

    var form = document.getElementById('saveas');
    form.getElementsByTagName('input')[1].value = 'foo.tm2';
    var submit = document.createEvent('HTMLEvents');
    submit.initEvent('submit', true, false);
    form.dispatchEvent(submit);
});

it('loads a project');

describe('Settings', function() {
    beforeEach(function() {
        event = document.createEvent('HTMLEvents');
    });

    it('should delete a project', function() {
        el = document.getElementById('settings-style').getElementsByClassName('js-ref-delete')[0];
    });
});
*/

describe('Code editor', function() {
    it('should set a tab as active', function() {
        var el = document.getElementById('tabs').getElementsByClassName('js-tab');
        el[0].dispatchEvent(event('click', true, false));
        assert.ok(el[0].getAttribute('class').match(/active/));
    });

    it('should delete a tab', function() {
        var el = document.getElementsByClassName('js-deltab');
        el[0].dispatchEvent(event('click', true, false));
        assert.ok(!el[0]);
    });

    describe('Tab creation', function() {
        it('should create a new tab', function() {
            document.getElementById('tabs')
                .getElementsByClassName('js-addtab')[0]
                .dispatchEvent(event('click', true, false));
            document.getElementById('addtab-filename').value = 'foo';
            document.getElementById('addtab')
                .dispatchEvent(event('submit', true, false));

            var tab = document.getElementById('tabs').getElementsByClassName('js-tab');
            assert.equal('foo.mss', tab[tab.length - 1].rel);
        });

        it('should reject file formats in the filename', function() {
            document.getElementById('tabs')
                .getElementsByClassName('js-addtab')[0]
                .dispatchEvent(event('click', true, false));
            document.getElementById('addtab-filename').value = 'foo.mss';
            document.getElementById('addtab')
                .dispatchEvent(event('submit', true, false));

            var tab = document.getElementById('tabs').getElementsByClassName('js-tab');
            assert.equal('foo.mss', tab[tab.length - 1].rel);
        });
    });
});

describe('Layers', function() {
    it('should open layers description', function() {
        var el = document.getElementById('layers').getElementsByClassName('js-tab');
        el[0].dispatchEvent(event('click', true, false));
        assert.ok(el[0].getAttribute('class').match(/active/));
    });
});

describe('Documentation', function() {
    it('should tab through help topics', function() {
        var el = document.getElementById('docs').getElementsByClassName('js-tab');
        var last = el[el.length - 1];
        last.dispatchEvent(event('click', true, false));
        assert.ok(last.getAttribute('class').match(/active/));
        assert.ok(document.getElementById(last.href.split('#')[1]).getAttribute('class').match(/active/));
    });
});

mocha.ignoreLeaks();

if (window.mochaPhantomJS) {
    mochaPhantomJS.run();
} else {
    mocha.run();
}
