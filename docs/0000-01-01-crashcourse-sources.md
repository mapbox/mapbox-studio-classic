Create a source
===============

Mapbox Studio does not apply visual styles to geospatial data files directly. Instead, raw data is converted into [mapnik vector tiles](./HOWTO-introduction.md#what-are-vector-tiles). The *Source editor* transforms [traditional geodata formats](./HOWTO-sources.md#supported-formats) into vector tiles containing the appropriate layers and configurations needed for styling.

In this tutorial we'll create vector tiles from geodata and use it to create a custom map style showing our data on a map.

Download data
-------------

In this crash course, we’ll use [earthquake data from the USGS](http://earthquake.usgs.gov/earthquakes/feed/) to make a map showing points for earthquakes that have occurred.

<div class='clearfix space-bottom0'>
    <a class='button icon down fill-green margin3 col6' href='http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.csv'>USGS Earthquakes CSV</a>
</div>
<div class='center small'><strong>right-click</strong> and save link as <code>earthquakes.csv</code></div>

Create a source project
-----------------------

Open Mapbox Studio and click on __Projects__ in the lower left - this will open up a listing of your projects. Switch the toggle at the top-right of the listing from __Styles__ to __Sources__, then click the __New source__ button at the top.

![New source](https://cloud.githubusercontent.com/assets/83384/3869854/8a6ee876-20ab-11e4-951f-4a67b8f41678.png)

Adding your first layer
-----------------------

1. Click the __New Layer__ button in Mapbox Studio. Click the __Browse__ button and use the file browser to find and select `earthquakes.csv`.

    ![Add data](https://cloud.githubusercontent.com/assets/83384/3868306/de0d1a6a-2034-11e4-8c2d-0ddd75dfb4fb.png)

2. In the right panel you'll see the configuration view for your newly-added layer. The name of the layer will autofill with metadata from the file. You can edit the layer name by clicking the pencil icon. Leave it as `earthquakes` for now.

    ![Change layer name](https://cloud.githubusercontent.com/assets/83384/3869871/f3096b30-20ac-11e4-84b2-c184f2d8c23c.png)

3. Verify that projection is set correctly. This field will also autofill with metadata from the file, and it should reference WGS84.

    ![Check projection](https://cloud.githubusercontent.com/assets/83384/3868307/de0d3db0-2034-11e4-81ab-8516f825796b.png)

	_Mapbox Studio autodetects the projection of most geodata files. If you have data that does not have its projection autodetected, report it as an [issue on GitHub](https://github.com/mapbox/mapbox-studio/issues)._

3. Click __Done__ to see your new layer. It is automatically given a color and style in the data preview.

Inspecting data properties
--------------------------

The map preview pane shows points where each point represents a distinct earthquake. Click on any point on the map to inspect the data for that earthquake. The layer name and color are shown so you can inspect multiple layers if features overlap. You will use these data fields later when styling this source.

![Inspect layers](https://cloud.githubusercontent.com/assets/83384/3869950/9d005c08-20b1-11e4-924a-c056027f02e9.png)

Field descriptions
------------------

Click the __earthquakes__ layer. Then click on the __Fields__ toggle to view all the fields present for this layer and descriptions of each field.

![Fields](https://cloud.githubusercontent.com/assets/83384/3869955/66d2e4e2-20b2-11e4-9f6e-a854c2292673.png)

Enter descriptions for each field and then click __Done__. Field descriptions are a helpful guide to the contents of each property and how it might be used when styling. The USGS website includes a [Glossary](http://earthquake.usgs.gov/earthquakes/feed/v1.0/glossary.php) describing their data fields.

Project settings & saving
-------------------------

Click on the __Settings__ button to bring up the project settings panel. You can set information about your project as a whole, such as a name, description, and attributing your data sources. Change the name of the project to *Earthquakes* so when it's uploaded you will be able to find it.

![Settings pane](https://cloud.githubusercontent.com/assets/83384/3869969/13aeada4-20b3-11e4-821f-6cd084cf791f.png)

Save your project. Click the __Save As__ button at the top of the window, or use the keyboard shortcut `Control+S` (`Command+S` on Mac OS X).

Mapbox Studio source projects are saved as a directory of files with a suffix of `.tm2source` automatically appended to the name.

Uploading
---------

Upload your project by click on the __Settings__ button, then __Upload to Mapbox__. Uploading a Mapbox Studio source project to Mapbox.com will allow you to use the source for Mapbox Studio style projects. 

![Upload project](https://cloud.githubusercontent.com/assets/83384/3869977/bc77bc78-20b3-11e4-9adb-73a6e28d0171.png)

Your project now has been converted to vector tiles that can be read from the Mapbox API. Once the upload is done processing __Copy its Map ID__. You will use this to add your custom vector tiles to a custom map style.

