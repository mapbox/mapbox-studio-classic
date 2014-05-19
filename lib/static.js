var _ = require('underscore');
var sm = new (require('sphericalmercator'));
var blend = require('blend');

module.exports = {};
module.exports.staticTiles = staticTiles;

// Generate the zxy and px/py offsets needed for each tile in a static image.
function staticTiles(z, x, y, s, w, h) {
    var dimensions = {x: w, y: h};
    var zoom = z;
    var tileSize = sm.size = 256 * s;

    var origin = sm.px([x, y], z);
    var centerCoordinate = {
            column: origin[0] / 256, 
            row: origin[1] / 256, 
            zoom: z 
        };

    function pointCoordinate(point) {
        var coord = { column: centerCoordinate.column,
                    row: centerCoordinate.row,
                    zoom: centerCoordinate.zoom,
                    };
        coord.column += (point.x - w / 2) / tileSize;
        coord.row += (point.y - h / 2) / tileSize;
        return coord;
    }

    function coordinatePoint(coord) {
        // Return an x, y point on the map image for a given coordinate.
        if (coord.zoom != zoom) coord = coord.zoomTo(zoom);
        return {
            x: w / 2 + tileSize * (coord.column - centerCoordinate.column),
            y: h / 2 + tileSize * (coord.row - centerCoordinate.row)
        };
    }

    function container(obj) {
        return {
                row: Math.floor(obj.row),
                column: Math.floor(obj.column),
                zoom: Math.floor(obj.zoom)
            }
    }

    var nw = container(pointCoordinate({x: 0, y:0}));
    var se = container(pointCoordinate(dimensions));
    var tiles = [];

    for (var column = nw.column; column <= se.column; column++) {        
        for (var row = nw.row; row <= se.row; row++) {
            var c = { column: column,
                    row: row,
                    zoom: zoom,
                    };
            var p = coordinatePoint(c);

            // Wrap tiles with negative coordinates.
            c.column = c.column < 0 ?
                Math.pow(2,c.zoom) + c.column :
                c.column % Math.pow(2,c.zoom);

            if (c.row < 0) continue;
            tiles.push({
                z: c.zoom,
                x: c.column,
                y: c.row,
                px: Math.round(p.x),
                py: Math.round(p.y)
            });
        }
    }
    // Include centerCoordinate, dimensions for use.
    // tiles.centerCoordinate = centerCoordinate;
    // tiles.dimensions = dimensions;
    console.log(tiles)
    return tiles;
}

// function loadTile() {
//     var url = '/style/static/:z(\\d+)/:x(\\d+)/:y(\\d+):scale(@\\d+x).:format([\\w\\.]+)'
// }

function staticTile(req, res, next) {
    var z = req.params.z | 0;
    var x = req.params.x | 0;
    var y = req.params.y | 0;
    var scale = req.params.scale[1] || 1;
    scale = scale > 4 ? 4 : scale;

    var id = req.source ? req.source.data.id : req.style.data.id;
    var source = req.params.format === 'vector.pbf'
        ? req.style._backend._source
        : req.style;
    var done = function(err, data, headers) {
        if (err && err.message === 'Tilesource not loaded') {
            return res.redirect(req.path);
        } else if (err) {
            // Set errors cookie for this style.
            style.error(id, err);
            res.cookie('errors', _(style.error(id)).join('|'));
            return next(err);
        }

        // Clear out tile errors.
        res.cookie('errors', '');

        headers['cache-control'] = 'max-age=3600';
        if (req.params.format === 'vector.pbf') {
            headers['content-encoding'] = 'deflate';
        }
        res.set(headers);
        return data;
    };
    done.scale = scale;
    if (req.params.format !== 'png') done.format = req.params.format;
    source.getTile(z,x,y, done);
};