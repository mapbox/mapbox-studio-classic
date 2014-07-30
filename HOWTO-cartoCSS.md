Mapbox Studio CartoCSS Styling
=======================

### Selectors

Mapbox Studio relies on the [CartoCSS](https://github.com/mapbox/CartoCSS) styling language. It should be familiar to CSS users and easy to pick up for everyone else. Here's a simple CartoCSS style:

```css
// Select the layer
// with ID "water"
#water {
  // Make all polygons blue
  polygon-fill: blue;
  // Add a green border
  line-color: green;
}
```

The first step to styling a map is to instruct the map _what_ piece of your data to style by declaring a selector:

Select the 'water' layer:

```css
#water {...}
```

In layer '#country_label', select features with class 'name', and in that class select countries with the value 'United States':

```css
#country_label[name='United States'] {...}
```

Use the wildcard selector to select all layers:

```css
* {...}
```

The order of selectors does not matter as there is no hierarchical structure in maps. Separating selector parts with spaces is optional. The following selectors are thus equivalent:

```css
#world [NAME='USA'] .red [zoom &gt; 10] {...}

[zoom &gt; 10].red#world[NAME='USA'] {...}

[NAME='USA'] [zoom &gt; 10] #world.red {...}
```

### Nested styles
Mapbox Studio allows you to arbitarily nest styles. All elements are added to create a combining selector. The order of elements in a selector is not of importance:

```css
// Applies to all layers
// with 'name' class
.name {
  text-name: ['name'];
  text-face-name: 'Lato Light';
  // Applies to class 'name'
  // in layer #country_names
  #counry_names { font-size: 15px; }
}
```

This can be a convenient way to group style changes by zoom level:

```css
// Select both landuse and water
// layers at zoom &gt; 1
[zoom &gt; 1] {
  // polygon-gamma applies
  // to both landuse and water
  polygon-gamma: 0.3;
  #landuse { polygon-fill: #323; }
  #water { polygon-fill: #144; }
}
```

### Attachments

By default, if you set a style rule, it overrides any previous style rules. However, sometimes you want to add multiple instances of a style, like in the case of a road border, country outline or for glow effects.

```css
#world {
  ::outline {
    line-color: #000;
    line-width: 6;
  }
  line-color: #fff;
  line-width: 3;
}
```

This style first renders a black line with width `6`, and on top of that, an additional white line with width `3`. You can use an arbitrary amount of attachments to draw the same feature multiple times. The order in which you define attachments matters, the earlier it is defined, the lower it is drawn. This means that you should define shadows first before defining the actual feature symbolizer.

When nesting attachments, they are concatenated together with a `/`:

```css
::outline {
  ::shadow {
  // creates a symbolizer named "outline/shadow"
  }
}
```

### Values

Different properties in CartoCSS accept different types of values - colors, dimensions, and more.

#### Colors

CartoCSS accepts a variety of syntaxes for colors - HTML-style hex values,
rgb, rgba, hsl, and predefined HTML colors names, like `yellow` and `blue`.

```css
#line {
  line-color: #ff0;
  line-color: #ffff00;
  line-color: rgb(255, 255, 0);
  line-color: rgba(255, 255, 0, 1);
  line-color: hsl(100, 50%, 50%);
  line-color: yellow;
}
```

#### Dimensions
Dimensions in CartoCSS are always pixels; no `px` suffix is needed. Pixel dimensions are noted in the reference as `float` values.

```css
line-width: 5;
```

#### Keywords

Some properties accept keyword arguments, which should be entered literally

```css
raster-mode: normal;
```

### Variables

You can define variables in stylesheets by prefixing an alphanumeric name with `@`.

```css
@green: #2B4D2D;
Map { background-color: @green; }
#world { polygon-fill: @green; }
```

### Operations
Any number, color or variable can be operated on using mathematical expressions.

```css
@gray: #888;

#world {
  polygon-fill: @gray + #111;
  line-width: 2 * 2;
  line-color: @gray / 2;
}
```
### Color functions
CartoCSS inherits color manipulation functions from [less.js](http://lesscss.org):

```css
// lighten or darken a color
lighten(@color, 10%);
darken(@color, 10%);

// de/saturate a color
saturate(@color, 10%);
desaturate(@color, 10%);

// adjust opacity of a color
fadein(@color, 10%);
fadeout(@color, 10%);

// set opacity of a color
fade(@color, 10%);

// adjust the hue of a color
// (e.g. on a color wheel)
spin(@color, 10);
spin(@color, -10);

// mix @color1 into @color2
mix(@color1,@color2, 10%);

// desaturate by 10%
greyscale(@color1, 10%);
```