MapBox Streets Vector Tiles
===========================

Overview
--------

### Zoom levels

For zoom levels 0 through 13, each vector tile contains only the information that would be appropriate for rendering at that scale of its given zoom level. For example, the `place_label` layer contains only major cities at zoom level 4, but contains all sizes of cities, towns, and villages at zoom level 10. Line and polygon information is generalized at lower zoom levels, not containing more detail than is necessary.

To reduce rendering time and disk space usage, zoom levels 15 and above are not rendered into vector tiles. Zoom level 14 contains all of the information and detail needed for rendering itself plus all zoom levels above. This is important to consider for styling - you safely render "everything" in a data tile from Z0-13, but starting at Z14 you will likely want to start restricting things (eg watch out for labels on very small buildings).

Attributes
----------

### `class` vs `type`

Most layers have a `class` or a `type` field to distinguish different types of objects in the layer. Values of `type` are transferred directly from an OpenStreetMap tag value. For example a value of `river` comes from the tag `waterway=river`. On the other hand, `class` values represent a generalized or derived classification to simplify styling. A value of `park` could come from one of many tags, such as `leisure=park`, `tourism=zoo`, or `boundary=national_park`.

### `osm_id`

Most objects have a `osm_id` number. These are derived from object IDs in OpenStreetMap database and are useful for identifying specific features. Because OpenStreetMap has three overlapping sets of ID number spaces, the `osm_id`s in the vector tiles have been modified to make them unique:

<!-- V2 -->
- IDs of nodes are multiplied by -1 (1 becomes -1)
- IDs of ways stay the same (1 stays 1)
- IDs of relations are increased by 10^12 (1 becomes 1000000000001)

<!-- V3, coming soon
- IDs of nodes are multiplied by -1 (1 becomes -1)
- IDs of ways that are lines stay the same (1 stays 1)
- IDs of ways that are polygons are increased by 10^12 (1 becomes 1000000000001)
- IDs of relations that are lines are increased by 2\*10^12  (1 becomes 2000000000001)
- IDs of relations that are polygons are increased by 3\*10^12 (1 becomes 3000000000001)
-->

### Names

The label layers currently contain 5 name columns:

- `name` for default local names
- `name_en` for English names
- `name_fr` for French names
- `name_es` for Spanish names
- `name_de` for German names

Translated names are not available for all entities. Where no translated name is available, the English, French, Spanish, and German name columns fall back to local names. Where the local name is in a non-Latin writing system, the French, Spanish, and German name columns will fall back to English if available rather than the local name.

English street names have had abbreviations applied for suffixes, directional prefixes, and other commonly-abbreviated words.


Layers
------

### Area Layers

At lower zoom levels, small areas are not included in the vector tiles. As you zoom in you will see more and more appear.

If you are familiar with OpenStreetMap data, you will see that the landuse/landcover areas have been separated into a small number of very general classes

Water areas appear on top of the background and landuse areas. Islands are represented as holes in the water. Landuse areas such as parks that extend into water bodies will be covered by the water.

A small number of area classes that should appear on top of water are instead in the `landuse_overlay` layer that appears on top of water. The `land` class of this layer contains some potentially structural elements including piers and breakwaters.


### Road Layers

The road layers also include route lines that are not roads, such as foot paths, cycle paths, and railroads. There are three layers to ensure proper ordering: tunnels, bridges, and regular roads. A simple road style that does not handle tunnels or bridges in any special way still needs to take them into account, or there will be gaps in your roads.

    #road,
    #tunnel,
    #bridge {
      // road styles
    }

The road layer contains multiple geometry types: points, lines, and polygons. This is done to ensure proper ordering of fills and casing, but complicates styles slightly. Use the `'mapnik::geometry_type'` property to limit your styles for each type.

    ['mapnik::geometry_type'=1] { /* points */ }
    ['mapnik::geometry_type'=2] { /* lines */ }
    ['mapnik::geometry_type'=3] { /* polygons */ }


### Label Layers

Label layers help you style the labels for objects that have names.

The order of the layers represents the order in which they are rendered. Objects in layers at the top of the list will be drawn on top of objects in layers at the bottom. (This is why all the top layers are for labels and the bottom ones are for landuse/landcover areas.)

#### Areas

Labels for polygons are stored in the vector tiles as points. These layers will have an `area` field to tell you how big the polygon they represent is. This is useful for restricting labels of small objects at zoom level 14 and above.

#### Extra attributes for styling

City points use some extra fields to allow for better styling at low zoom levels. The `scalerank` value is a subjective representation of cultural/cartographic significance from 1 (high significance) to 9. Many cities lack a scalerank value entirely and should be considered lowest on the significance scale. There is also a `ldir` field that can help set the initial label direction to try when using `text-placement-type: simple`. See the TileMill [Advanced Label Placement][1] guide for details.

[1]: http://mapbox.com/tilemill/docs/guides/labels-advanced/

Country labels also have a `scalerank` field that can be used to fit more labels on the map at low zoom levels by giving smaller countries a smaller text-size.

#### Avoiding cut-off labels

With traditional map tile rendering, metatiles are a common approach to reducing the occurrence of cut-off labels and markers at tile edges. Vector tile rendering cannot do this so your styles will need to take extra care to keep things seamless. Very large markers, very large text sizes, and very long labels should be avoided. Wrap your point labels to 200-250 pixels with `text-wrap-width: 200` and `text-wrap-before: true`.

#### Limited subset

To save on file size, all possible labels are not included in each vector tile, but a limited number of the most important ones bases on what could and should be reasonably labeled. For example, a very short road might not be in the `road_label` layer because there wouldn't be room to label it anyway.

The vector tiles also omit parks, water bodies, POIs, etc that are mapped only as nodes. The main reason is that there is no way to determine the size or importance of these things. Future versions of the vector tiles schema will likely contain more of these, but not all of them.
