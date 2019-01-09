var test = require('tape');
var spawn = require('child_process').spawn;
var path = require('path');
var assert = require('assert');
var http = require('http');
var fs = require('fs');

test('server', function(t) {
    var mbstudio = spawn(path.join(__dirname,'../index.js'), [], {});
    mbstudio.stdout.on('data', function (data) {
      t.ok(data.toString().indexOf('Mapbox Studio @ http://localhost:3000') > -1,'server started on port');
      var url = 'http://localhost:3000/style/14/8716/8015{format}?id=tmpstyle://'
      var style_path = path.resolve(path.join(__dirname,'../node_modules/mapbox-machine-styles/node_modules/mapbox-studio-streets'));
      t.ok(fs.existsSync(style_path),'test style exists');
      url += style_path;
      t.test('fetches @2x.png', function(st) {
          var png_url = url.replace('{format}','@2x.png');
          http.get(png_url,function(res) {
            t.equal(res.statusCode,200);
            var headers = res.headers;
            t.equal(headers['content-type'],'image/png');
            t.equal(headers['access-control-allow-origin'],'*');
            t.equal(headers['cache-control'],'max-age=3600');
            st.end();
          });
      });
      t.test('fetches @1x.png', function(st) {
          var png_url = url.replace('{format}','.png');
          http.get(png_url,function(res) {
            t.equal(res.statusCode,200);
            var headers = res.headers;
            t.equal(headers['content-type'],'image/png');
            t.equal(headers['access-control-allow-origin'],'*');
            t.equal(headers['cache-control'],'max-age=3600');
            st.end();
          });
      });
      t.test('fetches vector.pbf', function(st) {
          var png_url = url.replace('{format}','.vector.pbf');
          http.get(png_url,function(res) {
            t.equal(res.statusCode,200);
            var headers = res.headers;
            t.equal(headers['content-type'],'application/x-protobuf');
            t.equal(headers['access-control-allow-origin'],'*');
            t.equal(headers['cache-control'],'max-age=3600');
            st.end();
          });
      });
      t.test('shuts down server', function(st) {
          mbstudio.kill();
      });
    });

    mbstudio.stderr.on('data', function (data) {
      t.fail("should not have got stderr: " + data);
    });

    mbstudio.on('close', function (code) {
      t.equal(code,143);
      t.end();
    });
 });
