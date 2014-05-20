var _ = require('underscore');
var sm = new (require('sphericalmercator'));

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
            };
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
    return tiles;
}