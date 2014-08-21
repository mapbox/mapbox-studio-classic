Styling selectors
=================

CartoCSS styles are constructed by applying blocks of style rules to groups of objects. Style blocks are bounded by curly braces `{}` and contain style properties and values. _Selectors_ are what allow you restrict these styles to specific layers or groups of objects within layers.

## By layer ID

Select all of the objects from a single layer by the layer's ID. Separate multiple layer IDs with commas to select them for a single style.

    #layer_name {
      // styles
    }
    #layer_1,
    #layer_2 {
      // styles will apply to all the objects in both layers
    }

## By layer class

You can also assign classes to layers to select multiple layers more simply. In Mapbox Studio (unlike TileMill) layer classes are only available for advanced usage.

    .roads {
      // styles will apply to all layers
      // with a class of 'roads'
    }

## Filter selectors

You can modify selections with _filters_ that reduce the number of objects a style applies to based on certain criteria. Filters let your style read into the various text and numeric properties attached to each object in a layer. For example, you might have all your roads in a single layer, but you could use filters to specify different line colors for different road classifications.

Filters shoudl be written written inside square brackets after a layer selector or nested inside a larger style block.

### Zoom level filters

Restrict styles to certain zoom levels. This style will only apply when your map is zoomed all the way out to zoom level 0:

    #layer[zoom=0] { /* style */ }

You can specify ranges of zoom levels using two filters:

    #layer[zoom>=4][zoom<=10] { /* style */ }

Valid operators for zoom filters are `=` (equal to), `>` (greater than), `<` (less than), `>=` (greater than or equal to), `<=` (less than or equal to), `!=` (not equal to).

You can nest filters to better organize your styles. For example, this style will draw red lines from zoom levels 4 through 10, but the lines will be thicker for zoom levels 8, 9, and 10.

    #layer[zoom>=4][zoom<=10] {
      line-color: red;
      line-width: 2;
      [zoom=8] { line-width: 3; }
      [zoom=9] { line-width: 4; }
      [zoom=10] { line-width: 5; }
    }

### Numeric value comparison filters

The same comparison operators available for the zoom filter can also be used for any numeric column in your data. For example, you might have a `population` field in a source full of city points. You could create a style that only labels cities with a population of more than 1 million.

    #cities[population>1000000] {
      text-name: [name];
      text-face-name: 'Open Sans Regular';
    }

You could also combine multiple numeric filters with zoom level filters to gradually bring in more populated cities as you zoom in.

    #cities {
      [zoom>=4][population>1000000],
      [zoom>=5][population>500000],
      [zoom>=6][population>100000] {
        text-name: [name];
        text-face-name: 'Open Sans Regular';
      }
    }

As with zoom levels, you can select data based on numeric ranges.

    #cities[population>100000][population<2000000] { /* styles */ }

### Text comparison filters

You can also filter on columns that contain text. Filter on exact matches with the equals operator (`=`) or get the inverse results with the not-equal operator (`!=`). Unlike zoom and numeric values, text values must be quoted with either double or single quotes.

As an example, look at the `roads` layer in Mapbox Streets (the default vector tile source in Mapbox Studio). It contains a field called `class`, and each value for this field is one of just a few options such as "motorway", "main", and "street". This makes it a good column to filter on for styling.

    #roads {
      [class='motorway'] {
        line-width: 4;
      }
      [class='main'] {
        line-width: 2;
      }
      [class='street'] {
        line-width: 1;
      }
    }

To select everything that is *not* a motorway you could use the `!=` ("not equal") operator in the filter:

    #roads[class!='motorway'] { /* style */ }

### Regular expression filters

_Note: This is an advanced feature that may have negative performance implications._

You can match text in filters based on a pattern using the [regular expression](http://en.wikipedia.org/wiki/Regular_expression) operator (`=~`). This filter will match any text starting with 'motorway' (ie, both 'motorway' and 'motorway_link').

    #roads[class=~'motorway.*'] { /* style */ }

The `.` represents 'any character', and the `*` means 'any number of occurrences of the preceding expression. So `.*` used in combination means 'any number of any characters'.
