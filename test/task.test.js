var test = require('tape');
var task = require('../lib/task');
var stream = require('stream');
var progress = require('progress-stream');

test('task', function(t) {
    t.equal(task.get(), undefined);
    t.throws(function() { task.set('asdf'); }, /Invalid task object/);

    var testTask = new task.Task('asdf', 'export', progress());
    t.equal(task.set(testTask), undefined);
    t.throws(function() { task.set(testTask); }, /Active task in progress/);
    t.deepEqual(task.get(), testTask);

    var err = new Error('error occurred');
    testTask.progress.emit('error', err);
    t.deepEqual(task.get().err, err);

    testTask.progress.pipe(process.stdout);
    var unpiped = false;
    process.stdout.on('unpipe', function() { unpiped = true });
    t.equal(task.del(), undefined);
    t.equal(unpiped, true);

    t.equal(task.get(), undefined);
    t.end();
});

test('task.Task', function(t) {
    t.throws(function() { new task.Task(); }, /Task id must be a string/);
    t.throws(function() { new task.Task('id'); }, /Task type must be one of \[export, upload\]/);
    t.throws(function() { new task.Task('id','foo'); }, /Task type must be one of \[export, upload\]/);
    t.throws(function() { new task.Task('id','export'); }, /Task progress must be a progress stream/);
    t.doesNotThrow(function() { new task.Task('id','export',progress()); });

    var testTask = new task.Task('id','export',progress());
    t.deepEqual(JSON.stringify(testTask), '{"id":"id","type":"export","progress":{"percentage":0,"transferred":0,"length":0,"remaining":0,"eta":null,"runtime":0,"speed":0},"size":null,"url":null}');

    t.end();
});

test('task.Done', function(t) {
    t.throws(function() { new task.Done(); }, /Done id must be a string/);
    t.throws(function() { new task.Done('id'); }, /Done type must be one of \[export, upload\]/);
    t.throws(function() { new task.Done('id','foo'); }, /Done type must be one of \[export, upload\]/);
    t.throws(function() { new task.Done('id','export'); }, /Done url must be a string/);
    t.throws(function() { new task.Done('id','export','http://example.com'); }, /Done size must be a number/);
    t.doesNotThrow(function() { new task.Done('id','export','http://example.com',5); });

    var testDone = new task.Done('id','export','http://example.com',5);
    t.deepEqual(JSON.stringify(testDone), '{"id":"id","type":"export","progress":null,"size":5,"url":"http://example.com"}');

    t.end();
});

