TM2 Vector Tile Sources
=======================

TM2 source projects transform traditional geodata formats (shapefiles, geojson, postgis, etc.) into vector tiles. A `data.yml` file captures a configuration of datasources organized as named layers.

There is no visual style directly associated with sources - the source view of TM2 autogenerates an inspection style only for viewing your data. See [HOWTO-styles.md](./HOWTO-styles.md) to learn about applying styles to vector tile sources.

Quick Tutorial
--------------

### Create a new project

Open TM2 and click on your user icon at the top left - this will open up a listing of your projects. Switch the toggle at the top-right of the listing from __Styles__ to __Sources__, then click the __New Source__ button at the bottom.

### Project settings

Click on the __Settings__ button to bring up the project settings panel. Here you can set information about your project as a whole, such as a name, description, and attributing your data sources.

The __Minzoom__ and __Maxzoom__ are also important - these define which [zoom levels](https://www.mapbox.com/foundations/how-web-maps-work/#tiles-and-zoom-levels) will be included in your source. The Minzoom defines how far out users will be able to zoom and still see data, but Maxzoom is a bit different. Maxzoom defines the maximum zoom level your source will *store* data for, but it's possible to *display* this data at even higher zoom levels. This is referred to as *overzooming* and allows for great efficiency in creating and storing vector tiles, reducing the number of tiles required by several orders of magnitude.

As a general rule, vector tiles are useful for about 4-6  levels of overzooming, eg the data in a zoom level 14 tile can be stretched out and look great up to zoom level 18 or 20.

If you wish you can leave the project settings as they are and come back to adjust them at any time.

### Adding your first layer

TM2 supports several different types of data sources: Shapefiles, GeoJSON, geographic SQLite databases, PostGIS databases, and CSV (Comma-Separated Value) files containing latitude and longitude fields.

As an example, download this GeoJSON file of country polygons from Natural Earth (right-click and "Save link as"): [ne_110m_admin_0_countries.geojson](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson)

Now click the __New Layer__ button in TM2. Fill out a name like `countries`, select __GeoJSON__ as the format, then click the blue __New layer__ button.

In the right panel you'll see the configuration view for your newly-added layer. To point the layer at the correct file, click the __Browse__ button and use the file browser to find and select `ne_110m_admin_0_countries.geojson`.

Next you'll need to make sure your projection is set correctly. For the Natural Earth file, change this to `WGS84`.

_Currently TM2 only accepts input files in either WGS84 (aka EPSG:4326) or 900913 (aka EPSG:3857). If you have data in other projections, you should reproject it to 900913 before adding it as a layer._

### Inspect your data properties

_TODO_

### Saving

At this point you should save your project. Click the __Save As__ button at the top of the window, or use the keyboard shortcut `Control+S` (`Command+S` on Mac OS X).

### Exporting & Uploading

Exporting a TM2 source project will give you an [MBTiles]() file containing vector tiles that you can upload to Mapbox.com and use as a source for TM2 style projects. To export, click on the __Settings__ button, then __Export__ at the bottom of the popup. Exports will not include any un-saved changes, so be sure to save before you export.

Export times can vary widely depending on your data and desired number of zoom levels - anywhere from a few minutes to many hours.

Important Concepts
------------------

### Labeling polygons

Labeling polygons doesn't work quite like it could in TileMill 1. With vector tiles a polygon might be split across many vector tiles, so if you try to label it directly you will end up with lots of duplicate labels. Instead you willl need to derive a separate point layer and use that for polygon labeling.

You can do this beforehand with a tool like QGIS, or on-the-fly in a TM2 SQL query using PostGIS's `ST_PointOnSurface` function, eg:

```sql
( SELECT ST_PointOnSurface(geom) AS geom, name
  FROM ne_10m_lakes
) AS data
```

### Layer ordering

You can drag and drop layers in the layer list to reorder them. The order they're listed here will be the order they're stored in the vector tiles and the default order styles will use to draw. Layers at the top of the list will be drawn on top of layers further down. For most map designs, you will want an order that looks some thing like this:

- least important labels at the top
- most important labels below less important labels but above everything else
- roads and/or data layers in the middle
- landuse and landcover areas on the bottom

### Tile Buffers

Tile buffers allow you to inlcude extra data around the outside of each tile. Depending on the data and desired styles this can be necessary to ensure seamless rendering across tile boundaries. Tile buffers are set individually for each layer; different layers have different requirements and it's important to make boundaries no larger than necessary in order to keep the size of your vector tiles to a minimum.

The value for the buffer setting is in pixels (with the assumption that the vector tile is rendered at 256x256 pixels). General guidelines:

- Buffers for label layers should be quite large - often 128 pixels.
- Buffers for line and polygon layers should be at least half the width of the widest stroke you think you'll want to draw.
- If you think styles such as blurs or geometry-transforms will be useful for a layer, you'll want to take this into account. A buffer of 8 pixels will allow blurring by up to 8 pixels without artifacts.

Also note that tile buffers get stretched along with the rest of the tile when overzooming. A z14 layer with an 8 pixel buffer will actually have a 16 pixel buffer if shown overzoomed at z15, 32 pixels at z16, and so on.

### Object ordering for labels

_TODO_

Advanced PostgreSQL Layers
--------------------------

Have a look at the [Natural Earth TM2 project](https://github.com/mapbox/natural-earth-tm2) for a full TM2 source example, and advanced PostgreSQL tricks like having multiple tables in one layer and scale-aware queries.
