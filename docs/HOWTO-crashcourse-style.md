Styling your data
=======================

Mapbox Studio uses a language called CartoCSS to determine the look of a map. Colors, sizes, and shapes can all be manipulated by applying their relative CartoCSS parameters in the stylesheet panel to the right of the map. Read the [CartoCSS manual]() for a more detailed introduction to the language.

In the previous crash course section on [Importing a data source](./crashcourse-sources), we [created a data source with a country boundaries layer](./crashcourse-sources). If we had used the __Create style from source__ button, our stylesheet would be automatically prefilled with several styling parameters and given initial values.

![](./img/crashcourse-style-1.png =400x)

1. `#Countries` - the layer to which the styles are applied.
2. `line-color` - the color of the line.
2. `line-width` - the size of the line, in pixels.


Quick Tutorial
--------------
For this crash course, whoever, we're going to go beyond the prefilled styling parameters and composite our new `Countries` data source onto Mapbox Streets, and create a chloropleth map of the world based on population.

### Composite Sources
1. Create a new style by clicking on __Projects__ in the lower left, and click __New style__. Select the __Basic__ style project. We will use this as our data source for roads, city names, rivers, etc.
2. Add our Countries data source to this style project by opening the __Layers__ panel and clicking __Change Source__.
3. To composite the Countries data source, find the Countries source in the list of remote sources and enter the `mapid` (it will be `username.numberjumble`) before the existing `mapbox.mapbox-streets-v5`, separated by a comma and click __Update__. 

	Placing the `mapid` for Countries before that of Mapbox Streets is important because source is composed of layers which are in a specific order. In order to layer the roads and rivers on our Countries data, we need to have it below Mapbox Streets.

4. The countries layer will appear at the top of the __Layers__ list.

### Create a cartoCSS stylesheet
Mapbox Streets loads with its own cartoCSS, but our data has not been styled.

Let's ignore the Mapbox Streets' stylesheet for now and create a new stylesheet.

1. Click the plus in the top right corner of the cartoCSS pane to add a new tab. Title it `countries`.
2. Select the new countries tab and create a selector for the `Countries` layer. Add `polygon-fill: #eeffee` to style the shapes of the countries light green. Notice this color is below the place names and administrative (political) boundaries of Mapbox Streets.
3. Click __Save__ to view your changes.


###Conditional styles

Conditional CartoCSS styles allow you to change the appearance of the points on your map based on attributes in the data. Now we will customize the fill color of the countries based on the size of their population.

1. Click on __Layers__ in the sidebar to see a list of data features that can be styled. Under the name of the source is a list of each constituent layer. Clicking on a layer title will display the names of its data fields and descriptions.
2. Find the `Countries` layer - one of the data fields is 'pop_est'.
3. Make a selection on a particular piece of data  within the `Countries` layer by adding the data field name and a conditional after the `Countries` selector: `#Countries[pop_est >= 100000000] {...}`
	
	This will only fill countries with green that have populations equal or greater to 100 million. 
	
4. Click __Save__ to view your changes.

###Variables
You can save values such as color to variables and reference and manipulate those values.
1. At the top of your cartoCSS add `@population: rgb(180, 240, 220);` to create a variable named `population`.
2. Lets modify our selection on `Countries` so we can create more rules for `pop_est` data. Replace your current selection with the code below: 
	
	```
	#Countries{
	   [pop_est >= 1000000]   { polygon-fill: @population; }
	   [pop_est >= 10000000]  { polygon-fill: darken(@population, 10%); }
	   [pop_est >= 50000000]  { polygon-fill: darken(@population, 15%); }
	   [pop_est >= 100000000] { polygon-fill: darken(@population, 20%); }
	   [pop_est >= 50000000]  { polygon-fill: darken(@population, 25%); }
	   [pop_est >= 100000000] { polygon-fill: darken(@population, 30%); }
	   [pop_est >= 500000000] { polygon-fill: darken(@population, 35%); }
	   [pop_est >= 1000000000]{ polygon-fill: darken(@population, 40%); }
	}
```
3. Click __Save__ to view your changes.

Voila! A worldwide chloropleth map based on population size.