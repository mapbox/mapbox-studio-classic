module.exports = {
    get: get,
    set: set,
    del: del,
    Task: Task,
    Done: Done
};

var stream = require('stream');
var task = undefined;

// Get the currently active task.
function get() {
    return task;
}

// Set a task to be active.
function set(t) {
    if (task) throw new Error('Active task in progress');
    if (!(t instanceof Task)) throw new Error('Invalid task object');

    task = t;
    t.progress.on('finished', function() {
        if (task !== t) return;
        task = undefined;
    });
    t.progress.on('error', function(err) {
        if (task !== t) return;
        t.err = err;
    });
}

// Clear the current active task.
function del() {
    if (!task) return;
    task.progress.unpipe();
    task = undefined;
}

// A Task object, representing a stream pipe process which is not yet finished.
function Task(id, type, progress) {
    if (typeof id !== 'string') throw new Error('Task id must be a string');
    if (type !== 'export' && type !== 'upload') throw new Error('Task type must be one of [export, upload]');
    if (!progress || typeof progress.progress !== 'function') throw new Error('Task progress must be a progress stream');
    this.id = id;
    this.type = type;
    this.progress = progress;
}

Task.prototype.toJSON = function() {
    return {
        id: this.id,
        type: this.type,
        progress: this.progress.progress(),
        size: null,
        url: null,
        mapid: null
    };
};

// A Done object, a record of the completed result of a Task.
function Done(id, type, url, size, mapid) {
    if (typeof id !== 'string') throw new Error('Done id must be a string');
    if (type !== 'export' && type !== 'upload') throw new Error('Done type must be one of [export, upload]');
    if (typeof url !== 'string') throw new Error('Done url must be a string');
    if (typeof size !== 'number') throw new Error('Done size must be a number');
    this.id = id;
    this.type = type;
    this.url = url;
    this.size = size;
    this.progress = null;
    this.mapid = mapid || null;
}

Done.prototype.toJSON = function() {
    return {
        id: this.id,
        type: this.type,
        progress: null,
        size: this.size,
        url: this.url,
        mapid: this.mapid || null
    };
};

