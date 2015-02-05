Style manual
============

A Mapbox Studio style project is stored in a single directory with a `.tm2` file extension. A typical style project directory looks like this:

    sample-project.tm2/
        icons/
            park.png
            cafe.png
        project.yml
        project.xml
        style.mss
        .thumb.png

The components of the style project are:

- **project.yml** is the main project file in YAML format. This file contains the core metadata to the project as well as a reference to its vector tile source and the CartoCSS stylesheets it uses.
- **project.xml** is a compiled, ready-to-publish mapnik XML file for the project. It can be used directly with [tilelive-vector](https://github.com/mapbox/tilelive-vector) to render the style project as a map.
- **style.mss** and any other mss files are CartoCSS stylesheets used by the project.
- **.thumb.png** is a thumbnail image that serves as a quick preview of the project.
- **images and any other assets** used by a project should be kept in the project directory so that it is portable.

Referencing vector tile sources
-------------------------------

In order to design a Mapbox Studio style, you will need to have a vector tile source to supply data. Styles use the [Mapbox Streets](https://www.mapbox.com/developers/vector-tiles/mapbox-streets/) source by default, but can also use custom sources you've uploaded to your Mapbox account.

If you have been working on styles for streets in London and want to check how well your styles apply to data in Paris, Mapbox Studio will download the vector tiles on-the-fly as you pan over to France. Mapbox Studio caches downloaded vector tiles to an MBTiles database on disk so that you can take your work offline in a limited fashion.

### Remote sources

To change the source of a Mapbox Studio style, click on the __Layers__ icon then click on the blue __Change source__ button at the top of the layers panel. You will be shown a list of any vector tile sources you've uploaded to your Mapbox account.

Mapbox also provides some ready-made sources that you use to design your own custom styles. Documentation is available explaining the data provided by these layers and tips for styling them:

- [Mapbox Streets](https://www.mapbox.com/developers/vector-tiles/mapbox-streets/)
- [Mapbox Terrain](https://www.mapbox.com/developers/vector-tiles/mapbox-terrain/)


### Compositing remote sources

Multiple vector tile sources can be merged together into a single source if they are coming from the Mapbox API. For example, you can combine up-to-date OpenStreetMap data from Mapbox Streets with a custom overlay of your own data.

To do this, click on the __Layers__ icon, then __Change source__, then use the text box below the source list to enter up to 5 map IDs separated by commas. Eg:

    mapbox.mapbox-streets-v5,your-account.abc123

### Local sources

For complex vector tile sources, you might find it helpful to be developing both the source and the style at the same time. Mapbox Studio style projects can also reference local `.tm2source` projects as vector tile sources, so that you can quickly see changes without having to export or upload them.

To reference a local source, click on the __Layers__ icon, then __Change source__, then toggle from __Remote__ to __Local__. You'll be shown a list of all your local `.tm2source` projects that you can select from.

Local sources will not work in packaged & uploaded styles. Make sure to export & upload your source project and change the reference in your style project before you publish the style.

Custom layer order
------------------

To alter the layer order of any *remote* vector tile data source, manually edit the `project.yml` file of a style project by adding each layer `{id}` in *top-down* stacking order. Clone layers by listing `{id}.{class}` where `{class}` can be any word you choose to describe that layer. 

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

### Check layers with Mapbox API

Link below to .json files which list `{id}` values of all available layers of Mapbox remote vector tile data sources: 

 - [Mapbox Streets (v5)](http://a.tiles.mapbox.com/v4/mapbox.mapbox-streets-v5.json?access_token=pk.eyJ1IjoiZW5mIiwiYSI6IkNJek92bnMifQ.xn2_Uj9RkYTGRuCGg4DXZQ)
 - [Mapbox Terrain (v2)](http://a.tiles.mapbox.com/v4/mapbox.mapbox-terrain-v2.json?access_token=pk.eyJ1IjoiZW5mIiwiYSI6IkNJek92bnMifQ.xn2_Uj9RkYTGRuCGg4DXZQ)
 - [Mapbox Terrain (v1)](http://a.tiles.mapbox.com/v4/mapbox.mapbox-terrain-v1.json?access_token=pk.eyJ1IjoiZW5mIiwiYSI6IkNJek92bnMifQ.xn2_Uj9RkYTGRuCGg4DXZQ)
 - [Mapbox Satellite](http://a.tiles.mapbox.com/v4/mapbox.satellite,mapbox.mapbox-terrain-v2.json?access_token=pk.eyJ1IjoiZW5mIiwiYSI6IkNJek92bnMifQ.xn2_Uj9RkYTGRuCGg4DXZQ)

Check the layers available to your remote vector tile data source by using the [Mapbox API](https://www.mapbox.com/developers/api/) in the following format:

	http://a.tiles.mapbox.com/v4/{mapid}.json?access_token={youraccountaccesstoken}

_Note: Raster tile sources, such as Mapbox Satellite, must be combined with a vector source to list layer values in the API._


CartoCSS
--------

Mapbox Studio styles are defined using CartoCSS. A quick introduction to the language and a full reference list of properties are built into Mapbox Studio - click on the __Docs__ icon. 

If you are new to CartoCSS, the following guides on Mapbox.com will be helpful:

- [Selectors](https://www.mapbox.com/tilemill/docs/guides/selectors/)
- [Styling Lines](https://www.mapbox.com/tilemill/docs/guides/styling-lines/)
- [Styling Polygons](https://www.mapbox.com/tilemill/docs/guides/styling-polygons/)
- [Styling Labels](https://www.mapbox.com/tilemill/docs/guides/styling-labels/)
- [Symbol Drawing Order](https://www.mapbox.com/tilemill/docs/guides/symbol-drawing-order/)

UTFGrid interactivity
---------------------

[UTFGrid interactivity](https://github.com/mapbox/utfgrid-spec) can be added to style projects by manually editing the `project.yml` file and filling out these additional fields:

- `interactivity_layer`: the ID of the layer that should be made interactive.
- `template`: a UTFGrid [html/mustache template](https://github.com/mapbox/utfgrid-spec/blob/master/1.3/interaction.md#template) used to display data on tooltips.

Check out an example of this in action in our [Style Quickstart]({{site.baseurl}}/style-quickstart/#utfgrid-interactivity).

Publishing styles
-----------------

__Note:__ publishing requires an account on the [Mapbox Standard plan](https://www.mapbox.com/plans/) or higher.

Mapbox Studio styles are packaged into `.tm2z` files for publishing on Mapbox.com. The package contains only the styling information and no data and thus is relatively small. Inside it are:

- `project.xml` - the Mapnik-ready XML style definition automatically built by Mapbox Studio from the project's CartoCSS files and project.yml
- `.png`, `.jpg`, and `.svg` files, unless they begin with an `_`

All other files are omitted from packaging. A `.tm2z` file should not be used as a backup of your `.tm2` project as the original CartoCSS styles are not stored in it or recoverable from it.

If you have any source files (Photoshop/Gimp/Illustrator/Inkscape documents, mockups, reference files, etc) that are not directly required to render the style, they should be named beginning with an underscore or kept in a subdirectory beginning with an underscore. Mapbox Studio will ignore such files & folders when creating packages to deploy for rendering.
