Source manual
=============

A Mapbox Studio source project is stored in a single directory with a `.tm2source` file extension. A typical source project directory looks like this:

    source-project.tm2source/
        files/
            cafes.csv
        data.yml
        data.xml
        .thumb.png

The components of the style project are:

- **data.yml** is the main project file in YAML format. This file contains the core metadata to the project.
- **data.xml** is a compiled mapnik XML file for the project. It can be used directly with [tilelive-bridge](https://github.com/mapbox/tilelive-bridge) to render the project to vector tiles.
- **.thumb.png** is a thumbnail image that serves as a quick preview of the project.
- **data files** used by a project should be kept in the project directory so that it is portable.

Supported formats
-----------------

Mapbox Studio supports several different types of data sources: 

* Shapefiles
* GeoJSON
* geographic SQLite databases
* PostGIS databases
* GeoTIFFs
* VRTs
* KML
* GPX (GPS Exchange Format)
* CSV (Comma-Separated Value) files containing latitude and longitude fields.

Overzooming
-----------

In the settings pane, the __minzoom__ and __maxzoom__ are important - these define which [zoom levels](https://www.mapbox.com/foundations/how-web-maps-work/#tiles-and-zoom-levels) will be included in your source. The minzoom defines how far out users will be able to zoom and still see data, but maxzoom is a bit different. Maxzoom defines the maximum zoom level your source will *store* data for, but it's possible to *display* this data at even higher zoom levels. This is referred to as *overzooming* and allows for great efficiency in creating and storing vector tiles, reducing the number of tiles required by several orders of magnitude.

As a general rule, vector tiles are useful for about 4-6  levels of overzooming, eg the data in a zoom level 14 tile can be stretched out and look great up to zoom level 18 or 20.

Buffers
-------

The buffer setting on a layer allows you to inlcude extra data around the outside of each tile. Depending on the data and desired styles this can be necessary to ensure seamless rendering across tile boundaries. Tile buffers are set individually for each layer; different layers have different requirements and it's important to make boundaries no larger than necessary in order to keep the size of your vector tiles to a minimum.

The value for the buffer setting is in pixels (with the assumption that the vector tile is rendered at 256x256 pixels). General guidelines:

- Buffers for label layers should be quite large - often 128 pixels.
- Buffers for line and polygon layers should be at least half the width of the widest stroke you think you'll want to draw.
- If you think styles such as blurs or geometry-transforms will be useful for a layer, you'll want to take this into account. A buffer of 8 pixels will allow blurring by up to 8 pixels without artifacts.

Also note that tile buffers get stretched along with the rest of the tile when overzooming. A z14 layer with an 8 pixel buffer will actually have a 16 pixel buffer if shown overzoomed at z15, 32 pixels at z16, and so on.

Labeling polygons
-----------------

Labeling polygons doesn't work quite like it could in TileMill. With vector tiles a polygon might be split across many vector tiles, so if you try to label it directly you will end up with lots of duplicate labels. Instead you willl need to derive a separate point layer and use that for polygon labeling.

You can do this beforehand with a tool like QGIS, or on-the-fly in a Mapbox Studio SQL query using PostGIS's `ST_PointOnSurface` function, eg:

```sql
( SELECT ST_PointOnSurface(geom) AS geom, name
  FROM ne_10m_lakes
) AS data
```

Layer ordering
--------------

You can drag and drop layers in the layer list to reorder them. The order they're listed here will be the order they're stored in the vector tiles and the default order styles will use to draw. Layers at the top of the list will be drawn on top of layers further down. For most map designs, you will want an order that looks some thing like this:

- least important labels at the top
- most important labels below less important labels but above everything else
- roads and/or data layers in the middle
- landuse and landcover areas on the bottom

Advanced PostgreSQL Layers
--------------------------

Have a look at the [Natural Earth Mapbox Studio project](https://github.com/mapbox/natural-earth-tm2) for a full Mapbox Studio source example, and advanced PostgreSQL tricks like having multiple tables in one layer and scale-aware queries.
