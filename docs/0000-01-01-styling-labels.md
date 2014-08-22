Styling labels
==============

## Basic Point Labels

In CartoCSS, labelling is handled by a variety of properties beginning with `text-`. For each text-related style there are two required properties: `text-name`, which specifies what text goes in the labels, and `text-face-name`, which specifies the typeface(s) will be used to draw the label. (You can see which typefaces are available in the font browser - click the 'A' icon on the left button bar.)

The `text-name` property can pull text from your layer's data fields. If your layer contains a column called `name_en`, a simple label style would look like this:

![](https://cloud.githubusercontent.com/assets/126952/3881477/0145a420-218e-11e4-8961-23c6d57df53b.png)

    #place_label {
      text-name: [name_en];
      text-face-name: 'Open Sans Condensed Bold';
    }

The color and size of these labels will be the defaults - black and 10 pixels respectively. These can be adjusted with the `text-fill` and `text-size` properties.

![](https://cloud.githubusercontent.com/assets/126952/3881475/013ef2b0-218e-11e4-8f46-b578843e2092.png)

    #place_label {
      text-name: [name_en];
      text-face-name: 'Open Sans Condensed Bold';
      text-fill: #036;
      text-size: 20;
    }

To separate your text from the background, it is often useful to add an outline or _halo_ around the text. You can control the color with `text-halo-fill` and the width of the halo (in pixels) is controlled with `text-halo-radius`. In the example below, we are using the `fadeout` color function to make the white halo 30% transparent.

![](https://cloud.githubusercontent.com/assets/126952/3881476/014304f4-218e-11e4-9690-792b142c66fd.png)

    #place_label {
      text-name: [name_en];
      text-face-name: 'Open Sans Condensed Bold';
      text-fill: #036;
      text-size: 20;
      text-halo-fill: fadeout(white, 30%);
      text-halo-radius: 2.5;
    }

## Text Along Lines

You can also use CartoCSS to style labels that follow a line such as a road or a river. To do this we need to adjust the `text-placement` property. Its default is `point`; we'll change it to `line`. We've also added a simple style to visualize the line itself.

![](https://cloud.githubusercontent.com/assets/126952/3881773/9f47f6c6-2190-11e4-9d53-f49a687147cb.png)

    #waterway_label {
      text-name: [name_en];
      text-face-name: 'Open Sans Condensed Bold';
      text-fill: #036;
      text-size: 20;
      text-placement: line;
    }

For rivers it is nice to have the label offset parallel to the line of the river. This can be easily done with the `text-dy` property to specify how large (in pixels) this offset should be. (`dy` refers to a <b>d</b>isplacement along the __y__ axis.)

We'll also adjust the `text-max-char-angle-delta` property. This allows us to specify the maximum line angle (in degrees) that the text should try to wrap around. The default is 22.5°; setting it lower will make the labels appear along straighter parts of the line.

![](https://cloud.githubusercontent.com/assets/126952/3881774/9f4851e8-2190-11e4-8c86-cbdba0276f13.png)

    #waterway_label {
      text-name: [name_en];
      text-face-name: 'Open Sans Condensed Bold';
      text-fill: #036;
      text-size: 20;
      text-placement: line;
      text-dy: 12;
      text-max-char-angle-delta: 15;
    }

## Adding custom text

Labels aren't limited to pulling text from just one field. You can combine data from many fields as well as arbitrary text to construct your `text-name`. For example you could include a point's type in parentheses.

![](https://cloud.githubusercontent.com/assets/126952/3882373/597ad9f0-2196-11e4-9cbf-1977422cf312.png)

    #poi_label {
      text-name: [name_en] + ' (' + [type] + ')';
      text-face-name: 'Open Sans Condensed Bold';
      text-size: 16;
    }

Other potential uses:

- Multilingual labels: `[name] + '(' + [name_en] + ')'`
- Administrative units: `[city] + ', ' + [province]`
- Numeric units: `[elevation] + 'm'`
- Clever [unicode icons](http://copypastecharacter.com/symbols): `'⚑ ' + [embassy_name]` or `'⚓ ' + [harbour_name]`

You can also assign arbitrary text to labels that does not come from a data field. Due to a backwards-compatibility issue, you will need to quote such text twice for this to work correctly.

    #poi_label[maki='park'] {
      text-name: "'Park'";
      text-face-name: 'Open Sans Regular';
    }

If you need to include quotation marks in your custom quoted text, you will need to *escape* them with a backslash. For example, for the custom text **City's "Best" Coffee**:

    text-name: "'City\'s \"Best\" Coffee'";

## Multi-line labels

You can wrap long labels onto multiple lines with the `text-wrap-width` property which specifies at what pixel width labels should start wrapping. By default the first word that crosses the wrap-width threshold will not wrap - to change this you can set `text-wrap-before` to `true`.

![](https://cloud.githubusercontent.com/assets/126952/3882901/a1ccfc06-219b-11e4-8545-4fd89239e144.png)

    #poi_label {
      text-name: [name];
      text-face-name: 'Open Sans Condensed Bold';
      text-size: 16;
      text-wrap-width: 150;
      text-wrap-before: true;
    }

Note that text wrapping not yet supported with `text-placement: line`.

You may have a specific point where you want the line breaks to happen. You can use the code `\n` to indicate a new line.

    #poi_label {
      text-name: [name] + '\n' + [type];
      text-face-name: 'Open Sans Condensed Bold';
      text-size: 16;
    }
