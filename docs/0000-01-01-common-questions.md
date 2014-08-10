Common questions
================

###What is Mapbox Studio

Mapbox Studio is a desktop application for creating beautiful web maps. It was designed to easily integrate into existing GIS workflows to enhance design capabilities and flexibility. 

Map design is the core of Mapbox Studio. To manipulate geospatial data to be used on Mapbox Studio maps, you may need to look outside of tool or integrate it with other GIS software. Some spatial data can be worked with in Google Docs and Microsoft Excel, and for others GIS software like [QuantumGIS](http://www.qgis.org/) or [ESRI ArcGIS](http://www.esri.com/software/arcgis/index.html) may be needed. Spatial database software like [PostGIS](http://postgis.net/) and [SQLite](http://sqlite.org) can also be used to work with large spatial datasets and integrated into Mapbox Studio.

The main output of Mapbox Studio is tiled maps, made of millions of 256 px by 256 px vector tiles that are rendered as images in the browser and loaded quickly in interactive maps. Tiled maps are the basic technology behind the best panning and zooming maps on the web.

### What are vector tiles?

Vector tiles are the vector data equivalent of image tiles for web mapping. They apply the strengths of tiling -- developed for caching, scaling and serving map imagery rapidly -- to vector data. Consider an image tile at the zxy coordinate 14/4823/6160. This image is a PNG that depicts the corner of lower Manhattan with roads, building footprints, and parks:

    http://a.tiles.mapbox.com/v3/examples.map-zr0njcqy/14/4823/6160.png

A vector tile at 14/4823/6160 would contain all the corresponding geometries and metadata -- like road names, area types, building heights -- in a compact, parsable format. Vector tiles are a highly performant format that provide greater flexibility in terms of styling, output format, and interactivity.

### MBTiles
These map tiles are stored in a package file, called an [MBTiles file](http://mapbox.com/mbtiles-spec). This allows them to be compressed, copied, and transferred easily from place to place. Unlike most tiled maps, the maps you make in Mapbox Studio can be interactive - hovering and clicking on map tiles can trigger popups and even site navigation. The interactivity data is also compressed and stored in MBTiles files.

Unlike static maps, tiled maps tend to have many layers of detail - you’ll want to choose what features to show and hide at each zoom level. Mapbox Studio's styling language CartoCSS makes this easy, and it's fast to learn how to use it with a built-in reference, autocomplete, and error highlighting - and even easier if you’re already comfortable with CSS.

### Data and Styling

Unlike TileMill, Mapbox Studio makes a hard split between two types of packages:

- **[Styles](./HOWTO-styles.md)** contain stylesheets, basic thin metadata (name, description, attribution, etc.), and a *reference* to a datasource.
- **[Sources](./HOWTO-sources.md)** describe a source for vector tiles, for example a URL endpoint from which to download tiles. We also have an API for generating vector tiles on the fly from traditional Mapnik datasources (shapefiles, postgis, etc) -- see [tilelive-bridge](http://github.com/mapbox/tilelive-bridge) for more info.
