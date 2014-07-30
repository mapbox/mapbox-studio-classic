Mapbox Studio (development)
-----------------
There are currently no supported releases of this software.

[![Build Status](https://secure.travis-ci.org/mapbox/tm2.png)](http://travis-ci.org/mapbox/tm2)
[![Build status](https://ci.appveyor.com/api/projects/status/bfb4jhunuaqg48q5)](https://ci.appveyor.com/project/Mapbox/tm2)
[![Dependencies](https://david-dm.org/mapbox/tm2.png)](https://david-dm.org/mapbox/tm2)

### Install

Install [node v0.10.x](http://nodejs.org/download/). Then

    git clone https://github.com/mapbox/tm2.git
    cd tm2
    npm install
    npm start

*Note: the binary dependencies of Mapbox Studio are now prebuilt for common platforms (64 bit Linux and OS X). This means that you do not need to install these dependencies externally. However if packages fail to install from a binary then you are likely running a platform for which no binaries are available. In this case you will need to build these packages from source.*

### What are vector tiles?

Vector tiles are the vector data equivalent of image tiles for web mapping. They apply the strengths of tiling -- developed for caching, scaling and serving map imagery rapidly -- to vector data. Consider an image tile at the zxy coordinate 14/4823/6160. This image is a PNG that depicts the corner of lower Manhattan with roads, building footprints, and parks:

    http://a.tiles.mapbox.com/v3/examples.map-zr0njcqy/14/4823/6160.png

A vector tile at 14/4823/6160 would contain all the corresponding geometries and metadata -- like road names, area types, building heights -- in a compact, parsable format. Vector tiles are a highly performant format that provide greater flexibility in terms of styling, output format, and interactivity.

                   +----------+   +----------+
                   |          |   |          |
                   |  vector  |   | cartocss |
                   |   tile   +-+-+  styles  |
                   |          | | |          |
                   +----------+ | +----------+
                                v
                         +-------------+
                         |             |
                         |  renderer   |
                         |             |
                         +------+------+
                                |
         +---------------+------+------+---------------+
         |               |             |               |
    +----v-----+   +-----v----+   +----v-----+   +-----v----+
    |          |   |          |   |          |   |          |
    | geojson  |   | png tile |   | utf tile |   |  ??????  |
    |          |   |          |   |          |   |          |
    +----------+   +----------+   +----------+   +----------+


Vector tiles are designed to use the same tiling and coordinate scheme used by image tiles and take full advantage of HTTP. CDN caching, high scalability and efficient distribution make vector tiles a much more attractive solution than running, say, a enormous cluster of database and application servers that respond to queries on demand.

Here are some rough details of our implementation at time of writing:

- Vector tiles are [Protocol Buffers](http://code.google.com/p/protobuf/), a compact binary format for transferring messages.
- Vector tiles store a serialized version of the internal data that [Mapnik](http://mapnik.org/) uses when rendering maps.
- Vector tiles are organized into layers (e.g. roads, water, areas), which contain individual features each with a geometry and variable number of attributes per layer(e.g. name, type, etc.).

### Mapbox Studio architecture

Mapbox Studio ships with an example vector tile source: Mapbox Streets. When you create your first project you will have full access to style curated data from OpenStreetMap without setting up PostGIS, downloading and importing a large planet database file, or any of the other steps usually taken to work with OpenStreetMap data. If you have been working on styles for streets in London and want to check how well your styles apply to data in Paris, Mapbox Studio will download the vector tiles on-the-fly as you pan over to France. Mapbox Studio caches downloaded vector tiles to an MBTiles database on disk so that you can take your work offline in a limited fashion.

Unlike TileMill, Mapbox Studio makes a hard split between two types of packages:

- **[Styles](./HOWTO-styles.md)** contain stylesheets, basic thin metadata (name, description, attribution, etc.), and a *reference* to a datasource.
- **[Sources](./HOWTO-sources.md)** describe a source for vector tiles, for example a URL endpoint from which to download tiles. We also have an API for generating vector tiles on the fly from traditional Mapnik datasources (shapefiles, postgis, etc) -- see [tilelive-bridge](http://github.com/mapbox/tilelive-bridge) for more info.

------

Build status of modules:

 - mapnik - [![Build Status](https://secure.travis-ci.org/mapnik/mapnik.png?branch=2.3.x)](http://travis-ci.org/mapnik/mapnik)
 - node-mapnik - [![Build Status](https://secure.travis-ci.org/mapnik/node-mapnik.png)](http://travis-ci.org/mapnik/node-mapnik)
 - carto - [![Build Status](https://secure.travis-ci.org/mapbox/carto.png)](http://travis-ci.org/mapbox/carto)
 - tilelive.js - [![Build Status](https://secure.travis-ci.org/mapbox/tilelive.js.png)](http://travis-ci.org/mapbox/tilelive.js)
 - tilelive-vector - [![Build Status](https://secure.travis-ci.org/mapbox/tilelive-vector.png)](http://travis-ci.org/mapbox/tilelive-vector)
 - tilelive-bridge - [![Build Status](https://secure.travis-ci.org/mapbox/tilelive-bridge.png)](http://travis-ci.org/mapbox/tilelive-bridge)

