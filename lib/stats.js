module.exports = {};
module.exports.get = get;
module.exports.set = set;
module.exports.cookie = cookie;

// Get stats.
function get(source, key) {
    source.stats = source.stats || {};
    source.stats[key] = source.stats[key] || {};
    return source.stats[key];
}

// Set stats for a given zoom level.
function set(source, key, z, val) {
    source.stats = source.stats || {};
    source.stats[key] = source.stats[key] || {};
    source.stats[key][z] = source.stats[key][z] || { count:0 };

    var stats = source.stats[key][z];
    stats.min = Math.min(val, stats.min||Infinity);
    stats.max = Math.max(val, stats.max||0);
    stats.avg = stats.count ? ((stats.avg * stats.count) + val) / (stats.count + 1) : val;
    stats.count++;

    return;
}

// Serialize stats into a cookie.
function cookie(source, key) {
    var stats = get(source, key);
    var serialized = [];
    for (var z in stats) {
        serialized.push([z,stats[z].min,stats[z].avg|0,stats[z].max].join('-'));
    }
    return serialized.join('.');
}

