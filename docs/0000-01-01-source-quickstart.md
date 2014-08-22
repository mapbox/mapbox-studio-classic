Source quickstart
=================

Mapbox Studio does not apply visual styles to geospatial data files directly. Instead, raw data is converted into mapnik vector tiles. The *Source editor* transforms traditional geodata formats into vector tiles containing the appropriate layers and configurations needed for styling.

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

3. Verify that projection is set correctly. This field will also autofill with metadata from the file, and it should reference WGS84.

    _Mapbox Studio autodetects the projection of most geodata files. If you have data that does not have its projection autodetected, report it as an [issue on GitHub](https://github.com/mapbox/mapbox-studio/issues)._

4. Set the __Buffer size__ slider to __32__. The vector tile buffer determines how much extra data is included around the edges of each tile and can be used to prevent visual clipping artifacts when styling data.

5. Click __Done__ to see your new layer. It is automatically given a color and style in the data preview.

    ![Layer settings](https://cloud.githubusercontent.com/assets/83384/3870117/ccf6bd8a-20bb-11e4-8000-5c0401a62292.png)

    _The layer settings panel fully configured._

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

Styling custom data
===================

Click on __Projects__ in the lower left - this will open up a listing of your projects. Switch the toggle at the top-right of the listing from __Sources__ to __Styles__, then click the __New style__ button at the top.

Select the __Satellite Afternoon__ style to use a starting point for your new style.

![New style](https://cloud.githubusercontent.com/assets/83384/3870122/501656c6-20bc-11e4-889b-83d51f840787.png)

Changing the vector tile source
-------------------------------

Click on __Layers__ to open the layers pane and then click __Change source__ to choose a new source for this style project.

![Change source](https://cloud.githubusercontent.com/assets/83384/3870136/1cd60c56-20bd-11e4-9b7d-e20599c7003b.png)

Add a command and the Mapbox __Map ID__ of your vector source to the end of the list of sources in the input field. The Mapbox API will automatically composite the existing sources (Mapbox Satellite, Mapbox Terrain, Mapbox Streets) with your new source. Click __Update__ after you have entered the full map ID.

    mapbox.satellite,mapbox.mapbox-terrain-v1,mapbox.mapbox-streets-v5,[Map ID]

_The full composited list of Map IDs that should be in your source field_

Add a stylesheet tab
--------------------

Click on the __+__ button on the top right of the style editor to add a new tab. Name your tab _earthquakes_.

![Add tab](https://cloud.githubusercontent.com/assets/83384/3870168/cad0390c-20be-11e4-8050-7521ce362d77.png)

Styling points
--------------

Add the following CartoCSS to your _earthquakes_ stylesheet and then click __Save__.

    #earthquakes {
      marker-comp-op:screen;
      marker-allow-overlap:true;
      marker-line-width:0;
      marker-fill:#a20;
      [zoom>=0] { marker-width:[mag]*[mag]*0.1; }
      [zoom>=2] { marker-width:[mag]*[mag]*0.2; }
      [zoom>=3] { marker-width:[mag]*[mag]*0.4; }
      [zoom>=4] { marker-width:[mag]*[mag]*0.6; }
      [zoom>=5] { marker-width:[mag]*[mag]*1; }
      [zoom>=6] { marker-width:[mag]*[mag]*2; }
      [zoom>=7] { marker-width:[mag]*[mag]*4; }
      [zoom>=8] { marker-width:[mag]*[mag]*8; }
      [zoom>=9] { marker-width:[mag]*[mag]*12; }
      [zoom>=10] { marker-width:[mag]*[mag]*24; }
      [zoom>=11] { marker-width:[mag]*[mag]*48; }
    }

![Styling points](https://cloud.githubusercontent.com/assets/83384/3870179/5bf756a4-20bf-11e4-95cf-f18b370aa95c.png)

- `marker-width: [mag]*[mag]*n` properties draw each earthquake point as a circle scaled by the `[mag]` field.
- `[zoom>=n]` selectors increase the size of each circle as you zoom in.
- `marker-allow-overlap: true` allows the circles to be drawn over each other.
- `marker-comp-op: screen` switches the blend mode of the markers so overlapping circles create an interesting visual affect.

Styling labels
--------------

Next we will add labels so that earthquakes with a large magnitude are labeled clearly on the map. Add the following CartoCSS to your _earthquakes_ stylesheet and then click __Save__.

    #earthquakes::label[zoom>=6][mag>=4],
    #earthquakes::label[zoom>=8][mag>=3] {
      text-allow-overlap:true;
      text-size:14;
      text-name:'[mag]';
      text-face-name:'BentonGraphicsSansCond BlackIt';
      text-fill:#fff;
    }

![Styling labels](https://cloud.githubusercontent.com/assets/83384/3870195/37ba920a-20c0-11e4-99e5-93f1912e5f5b.png)

- `#earthquakes::label` defines a new CartoCSS attachment. The properties in this attachment will be drawn on top of any previous `#earthquake` layer rules.
- `text-allow-overlap: true` allows text to be drawn on top of markers and other labels.
- `text-name: '[mag]'` sets the layer field to use for the contents of the text labels.

Uploading
---------

Upload your project by click on the __Settings__ button, then __Upload to Mapbox__. Publishing custom styles requires a [Mapbox Standard plan](https://www.mapbox.com/plans/) and you may be prompted if you aren't yet on one.

![Upload style](https://cloud.githubusercontent.com/assets/83384/3870219/d2d2ffe6-20c2-11e4-97b8-83bd1965a4ff.png)

Mission complete
----------------

Your map style is now deployed to Mapbox and has a __Map ID__. You can use this map with any of the Mapbox Developer APIs to integrate into your apps and sites.

<div class='clearfix'>
    <a class='button rcon next margin3 col6' href='https://www.mapbox.com/developers/'>Developer docs</a>
</div>

