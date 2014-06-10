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

describe('Setting maxzoom', function() {
    it('sets maxzoom to higher value than 6 (tests logic preference for higher maxzoom...see #addlayer-shape test)', function() {
        var maxzoomTarget = $('#settings #maxzoom');
        maxzoomTarget.val(12);
        $('#settings .js-save').submit();
        var maxzoom = maxzoomTarget.val();
        assert.equal(maxzoom, 12);
    });
});

describe('#addlayer-shape', function() {
    it('adds new shapefile and checks input values', function(done) {
        //Browse for file and add new shape layer
        $('.js-addlayer').click();
        $('.js-browsefile').click();
        var cwd = $('div.cwd').text();
        //This RegEx can probably be cleaned up, but it works for now
        cwd = cwd.replace(/\s*$/,"");
        var array = cwd.split(/[\s,]+/);
        var shpFile = array[1] + '/test/fixtures-localsource/10m-900913-bounding-box.shp';
        $('#browsefile .col8').val(shpFile);
        $('#browsefile .col4').submit();
        onajax(function() {
        	var maxzoomTarget = $('#settings #maxzoom');
        	var maxzoom = maxzoomTarget.val();
        	var projTarget = $('.js-metadata-projection');
   			var expectedValue = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over';
			assert.equal(expectedValue, projTarget.val());
        	assert.equal(maxzoom, 12);
        	done();	
        });
    });
});

describe('Setting maxzoom', function() {
    it('sets maxzoom', function() {
        var maxzoomTarget = $('#settings #maxzoom');
        maxzoomTarget.val(6);
        $('#settings .js-save').submit();
        var maxzoom = maxzoomTarget.val();
        assert.equal(maxzoom, 6);
    });
});

describe('Setting projection', function() {
	it('tests the projection input field is populated with the expected projection', function() {
		var projTarget = $('.js-metadata-projection');
		var expectedValue = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over';
		assert.deepEqual(expectedValue, projTarget.val());
	});	
});

describe('#updatename-shape', function(){
    it('updates the layer name and checks that input values and new layer modal are set', function() {
        //Set description of old layer
        $('.js-layer #10m-900913-bounding-box').click();
        $('#10m-900913-bounding-box-buffer-size').val('24');
        var expectedBuffer = $('#10m-900913-bounding-box-buffer-size').val();

        //Update layer name
        $('#updatename-10m-900913-bounding-box').click();
        $('#newLayername').val('hey');
        $('#updatename').submit();

        var currentUrl = window.location.toString();
        var newBufferTarget = $('#hey-buffer-size-val');

        assert.equal(currentUrl.slice(-10),'layers-hey');
        assert.equal(expectedBuffer, newBufferTarget.text());
    });
});

mocha.ignoreLeaks();

if (window.mochaPhantomJS) {
    mochaPhantomJS.run();
} else {
    mocha.run();
}