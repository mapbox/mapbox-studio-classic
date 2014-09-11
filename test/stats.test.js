var test = require('tape');
var stats = require('../lib/stats');

test('stats.set/get', function(t) {
    var source = {};
    t.equal(stats.set(source, 'drawtime', 0, 100), undefined, 'set');
    t.deepEqual(stats.get(source, 'drawtime'), {
        0: { count:1, avg:100, min:100, max:100 }
    }, 'sets stats');

    t.equal(stats.set(source, 'drawtime', 0, 200), undefined, 'set');
    t.deepEqual(stats.get(source, 'drawtime'), {
        0: { count:2, avg:150, min:100, max:200 }
    }, 'calculates avg/min/max');

    t.equal(stats.set(source, 'drawtime', 1, 200), undefined, 'set');
    t.deepEqual(stats.get(source, 'drawtime'), {
        0: { count:2, avg:150, min:100, max:200 },
        1: { count:1, avg:200, min:200, max:200 }
    }, 'segments by zoom');

    t.equal(stats.set(source, 'srcbytes', 0, 200), undefined, 'set');
    t.deepEqual(stats.get(source, 'drawtime'), {
        0: { count:2, avg:150, min:100, max:200 },
        1: { count:1, avg:200, min:200, max:200 }
    }, 'segments by key');
    t.deepEqual(stats.get(source, 'srcbytes'), {
        0: { count:1, avg:200, min:200, max:200 }
    }, 'segments by key');
    t.end();
});

test('stats.cookie', function(t) {
    var source = {};
    t.equal(stats.set(source, 'drawtime', 0, 100), undefined, 'set');
    t.equal(stats.set(source, 'drawtime', 1, 200), undefined, 'set');
    t.equal(stats.cookie(source, 'drawtime'), '0-100-100-100.1-200-200-200', 'serializes cookie');
    t.end();
});

