'use strict';

var assert = chai.assert;

mocha.setup('bdd');

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
    setTimeout(function() { callback(); }, 1);
});

function hasModal(selector) {
    return $('#modal-content ' + selector).size() > 0;
}

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
*/

describe('#user', function() {
    it('browses sources', function() {
        $('#user .js-browsesource').click();
        assert.ok(hasModal('#browsesource'));
    });

    it('browses styles', function() {
        $('#user .js-browsestyle').click();
        assert.ok(hasModal('#browsestyle'));
    });

    it('removes history style', function(done) {
        var count = $('#history-style .project').size();
        $('#history-style .js-ref-delete:eq(0)').click();
        onajax(function() {
            assert.equal(count - 1, $('#history-style .project').size());
            done();
        });
    });
});

describe('#style-ui', function() {
    it('sets a tab as active', function() {
        $('#tabs .js-tab:eq(0)').click();
        assert.ok($('#tabs .js-tab:eq(0)').hasClass('active'));
    });

    it('deletes a tab', function() {
        var count = $('#tabs .js-tab').size();
        $('#tabs .js-deltab:eq(0)').click();
        assert.equal(count - 1, $('#tabs .js-tab').size());
    });

    it('creates a new tab', function() {
        $('#tabs .js-addtab:eq(0)').click();
        assert.ok(hasModal('form#addtab'));

        $('#addtab-filename').val('foo');
        $('#addtab').submit();

        // Submit removes modal.
        assert.equal(0, $('#addtab-filename').size());

        // Automatically adds .mss extension.
        assert.equal('foo.mss', $('#tabs .js-tab:last').attr('rel'));
    });

    it('prevents duplicate extensions in filename', function() {
        $('#tabs .js-addtab:eq(0)').click();
        assert.ok(hasModal('#addtab'));

        $('#addtab-filename').val('bar.mss');
        $('#addtab').submit();

        // Submit removes modal.
        assert.ok(!hasModal('#addtab'));

        // Prevents duplicate .mss extension.
        assert.equal('bar.mss', $('#tabs .js-tab:last').attr('rel'));
    });

    it('requires unique stylesheet name', function() {
        $('#tabs .js-addtab:eq(0)').click();
        assert.ok(hasModal('form#addtab'));

        $('#addtab-filename').val('baz');
        $('#addtab').submit();

        $('#tabs .js-addtab:eq(0)').click();
        assert.ok(hasModal('form#addtab'));

        $('#addtab-filename').val('baz');
        $('#addtab').submit();

        assert.ok(hasModal('#message'));
        assert.equal('Tab name must be different than existing tab "baz"', $('#message > div').text());
    });
});

describe('#layers', function() {
    it('opens layer description', function() {
        $('#layers .js-tab:eq(0)').click();
        assert.ok($('#layers .js-tab:eq(0)').hasClass('active'));
    });

    it('shows sources modal', function(done) {
        $('#layers .js-modalsources:eq(0)').click();
        onajax(function() {
            assert.ok(hasModal('#modalsources'));
            done();
        });
    });

    it('shows sources modal', function(done) {
        $('#layers .js-modalsources:eq(0)').click();
        onajax(function() {
            assert.ok(hasModal('#modalsources'));
            $('#modalsources-remote .js-adddata:eq(0)').click();
            onajax(function() {
                assert.ok(!hasModal('#modalsources'));
                done();
            });
        });
    });
});

describe('#docs', function() {
    it('tabs through help topics', function() {
        $('#docs .js-tab:last').click();
        var target = $('#' + $('#docs .js-tab:last').attr('href').split('#').pop());
        assert.ok($('#docs .js-tab:last').hasClass('active'));
        assert.ok(target.hasClass('active'));
    });
});

mocha.ignoreLeaks();

if (window.mochaPhantomJS) {
    mochaPhantomJS.run();
} else {
    mocha.run();
}
