Layer and data order
====================

Data in Mapbox Studio - *sources, layers, objects, and symbols* - are drawn using a [Painter's Algorithm](http://en.wikipedia.org/wiki/Painter's_algorithm), meaning everything is drawn in a specific order, and things that are drawn first might be covered by things that are drawn later. 

## Overview

The order in which objects are drawn depends on the following conditions. See the sections that follow for more details.

1. [Priority](#order-vs-priority): "Higher" layers obscure "lower" ones.
2. [Layer order](#layer-order): by default, layers in Studio are drawn bottom up based on how they are stored in the vector tile. This can be defined, see [custom layer ordering](#custom-layer-ordering) below.
3. [Attachment order](#attachment-order): within a stylesheet, attachments you set (eg,  `::glow { ... }`) are ordered from top to bottom.
4. [Symbolizer order](#symbolizer-order): you can add multiple property instances on the same object (eg `a/line-color: blue; b/line-color: red;`), these are drawn in the order they are defined.
5. [Data source order](#data-source-order): the order in which you define your data sources decide the order they and their layers are drawn.
6. [Custom layer ordering](#custom-layer-ordering): alter the order in which your data source layers are drawn by manually editing the `project.yml` file in your `.tm2` folder.
7. [Data ordering with PostGIS](#data-ordering-with-postgis): manipulated how the data in your custom data source with SQL and PostGIS.




## Order vs. priority

For things like lines and areas, objects that are drawn first are less likely to be fully visible. Objects high in the stack might completely obscure other objects, thus you might associate these with a high 'priority' or 'importance'.

However for things like text, markers, and icons that have their _allow-overlap_ properties set to false (the default) things work a bit differently. Objects that are drawn first are __more__ likely to be visible; instead of letting things sit on top of each other, overlapping objects are simply skipped. Since such objects higher in the stack are less likely to be drawn, you might associate these with a low 'priority' or 'importance'.

## Layer order

In Studio, layers are rendered in order starting at the bottom of the layers list moving up. If you look at the layers in the Mapbox Streets vector tile source you can see that the basic parts of the map (eg. landuse areas, water) are in layers at the bottom of the list. The things that shouldn't be covered up by anything else (eg. labels, icons) are in layers at the top of the list.

![layer-ordering](https://cloud.githubusercontent.com/assets/4587826/6082987/740b324e-adf3-11e4-9c44-71c50304afd9.png)

## Attachment order

Within a layer, styles can be broken up into 'attachments' with the `::` syntax. Think of attachments like sub-layers.

![symbol-order-0](https://cloud.githubusercontent.com/assets/126952/3895676/2e8e4686-2250-11e4-8655-7d4498470238.png)

    #layer {
      ::outline {
        line-width: 6;
        line-color: black;
      }
      ::inline {
        line-width: 2;
        line-color: white;
      }
    }

Attachments are drawn in the order they are first defined, so in the example above the `::outline` lines will be drawn below the `::inline` lines.

Note that all styles are nested inside attachments. If you don't explicitly define one, a default attachment still exists. Thus the following style produces the same result as the one above.

![symbol-order-0](https://cloud.githubusercontent.com/assets/126952/3895676/2e8e4686-2250-11e4-8655-7d4498470238.png)

    #layer {
      ::outline {
        line-width: 6;
        line-color: black;
      }
      line-width: 2;
      line-color: white;
    }

## Symbolizer order

Each layer may have multiple *symbolizers* applied to it. That is, a polygon might have both a fill and an outline. In this case, the styles are drawn in the same order they are defined.

In this style, the outline will be drawn below the fill:

![symbol-order-1](https://cloud.githubusercontent.com/assets/126952/3895677/2e921f72-2250-11e4-8643-8271bf00b3e9.png)

    #layer {
      line-width: 6;
      polygon-fill: #aec;
      polygon-opacity: 0.8;
    }

In this style, the line is drawn on top of the fill:

![symbol-order-2](https://cloud.githubusercontent.com/assets/126952/3895679/2ea0ca40-2250-11e4-883c-a6b0b4d00847.png)

    #layer {
      polygon-fill: #aec;
      polygon-opacity: 0.8;
      line-width: 6;
    }

It's also possible to create multiple symbols of the same type within a layer using named *instances*. Like attachments, their names are arbitrary.

![symbol-order-3](https://cloud.githubusercontent.com/assets/126952/3895678/2e933cc2-2250-11e4-825e-571a633f24cc.png)

    #layer {
      bottomline/line-width: 6;
      middleline/line-width: 4;
      middleline/line-color: white;
      topline/line-color: red;
    }

Note that symbolizer ordering happens after all other types of ordering - so an outline might be on top of one polygon but beneath a neighboring polygon. If you want to ensure lines are always below fills, use separate attachments.

## Data source order

The order in which your data sources are listed in Studio also influences rendering order: data from sources are rendered in order. So if you click "Change source" under "Layers" and you see `you.id123,mapbox.mapbox-terrain-v1`, the layers from `mapbox.mapbox-terrain-v1` will render last, over the layers from `you.id123`. To ensure that your own data renders last, use `mapbox.mapbox-terrain-v1,you.id123`.

## Custom layer ordering

Alter the layer order of any remote vector tile data source by manually edit the `project.yml` file of a style project by adding each layer `{id}` in *top-down* stacking order. Clone layers by listing `{id}.{class}` where `{class}` can be any word you choose to describe that layer. 

Example below specifies layers from Mapbox Terrain (v1) and Mapbox Streets (v5) vector sources with the `contour` layer cloned:

    source: "mapbox:///mapbox.mapbox-terrain-v1,mapbox.mapbox-streets-v5"
    layers:
      - landcover
      - landuse
      - contour.line
      - hillshade
      - contour.label

Layers are stacked on the map *top-down* based on the `project.yml` list, however once in Studio the stack is listed *bottom-up*.

![Locked](https://cloud.githubusercontent.com/assets/83384/4242524/a059b1ea-39fe-11e4-9aad-8cf8d371e6a7.png)

_Data source is now locked in Studio since custom layer order defined, additional changes must be done manually in `project.yml`._

_Note: After making edits to the `project.yml` file in a text editor, quit and restart Mapbox Studio to see your changes. Studio loads up your project into memory and currently does not detect changes from other text editors._

### Check data source layers with Mapbox API

Link below to .json files which list `{id}` values of all available layers of Mapbox remote vector tile data sources: 

 - [Mapbox Streets (v5)](http://a.tiles.mapbox.com/v4/mapbox.mapbox-streets-v5.json?access_token=pk.eyJ1IjoiZW5mIiwiYSI6IkNJek92bnMifQ.xn2_Uj9RkYTGRuCGg4DXZQ)
 - [Mapbox Terrain (v2)](http://a.tiles.mapbox.com/v4/mapbox.mapbox-terrain-v2.json?access_token=pk.eyJ1IjoiZW5mIiwiYSI6IkNJek92bnMifQ.xn2_Uj9RkYTGRuCGg4DXZQ)
 - [Mapbox Terrain (v1)](http://a.tiles.mapbox.com/v4/mapbox.mapbox-terrain-v1.json?access_token=pk.eyJ1IjoiZW5mIiwiYSI6IkNJek92bnMifQ.xn2_Uj9RkYTGRuCGg4DXZQ)
 - [Mapbox Satellite](http://a.tiles.mapbox.com/v4/mapbox.satellite,mapbox.mapbox-terrain-v2.json?access_token=pk.eyJ1IjoiZW5mIiwiYSI6IkNJek92bnMifQ.xn2_Uj9RkYTGRuCGg4DXZQ)

Check the layers available to your remote vector tile data source by using the [Mapbox API](https://www.mapbox.com/developers/api/) in the following format:

	http://a.tiles.mapbox.com/v4/{mapid}.json?access_token={youraccountaccesstoken}

_Note: Raster tile sources, such as Mapbox Satellite, must be combined with a vector source to list layer values in the API._

## Data ordering with PostGIS

The order that your data is stored/retrieved in is also significant. The ordering of objects in the Mapbox Streets vector tiles have been optimized for the most common rendering requirements.

If you are creating a custom vector tile source this is something you will have to consider. When styling city labels, for example, it's good to ensure that the order of your data makes sense for label prioritization. For data coming from an SQL database you should `ORDER BY` a population column or some other prioritization field in the select statement.

Data coming from files are read from the beginning of the file to the end and cannot be re-ordered on-the-fly by Mapbox Studio. You'll want to pre-process such files to make sure the ordering makes sense.

You can do this from the terminal with `ogr2ogr`. This example rearranges all the objects in `cities.shp` based on the `population` field in descending order (highest population first).

    ogr2ogr -sql \
      'select * from cities order by population desc' \
      cities_ordered.shp cities.shp

For more on PostGIS and data ordering, check out [Controlling label density]({{site.baseurl}}/postgis-manual/#controlling-label-density) in our [PostGIS Manual]({{site.baseurl}}/postgis-manual/).

