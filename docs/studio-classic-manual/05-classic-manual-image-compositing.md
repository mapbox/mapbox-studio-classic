# Image compositing

Image compositing is the process of changing the way colors and textures of different style layers interact with each other. Without any compositing operations, style layers will be painted directly over one another. With image compositing, we can specify exactly how we want these separate layers to interact visually.


## Getting started

Before you start learning to using compositing operations, be sure to read the other guides in this manual first, especially the section on [CartoCSS](https://www.mapbox.com/help/studio-classic-cartocss/). This guide assumes you are familiar with Mapbox Studio Classic and CartoCSS concepts and are editing your map in [style mode](https://www.mapbox.com/help/studio-classic-styles/) within Mapbox Studio Classic.


## Compositing operations

There are 33 compositing operations available in CartoCSS. The operations in the first two columns are **color blending modes** that provide a variety of ways to control the blending of the colors of style layers with each other. The operations in the last column are [**Duff-Porter alpha blending modes**](http://www.imagemagick.org/Usage/compose/#duff-porter). They provide a variety of ways to fill and mask style layers with each other.

<table>
  <tr><th colspan='2'>Color blending modes</th><th>Alpha blending modes</th></tr>
  <tr><td>plus</td><td>difference</td><td>src</td></tr>
  <tr><td>minus</td><td>exclusion</td><td>dst</td></tr>
  <tr><td>multiply</td><td>contrast</td><td>src-over</td></tr>
  <tr><td>screen</td><td>invert</td><td>dst-over</td></tr>
  <tr><td>overlay</td><td>invert-rgb</td><td>src-in</td></tr>
  <tr><td>darken</td><td>grain-merge</td><td>dst-in</td></tr>
  <tr><td>lighten</td><td>grain-extract </td><td>src-out</td></tr>
  <tr><td>color-dodge</td><td>hue</td><td>dst-out</td></tr>
  <tr><td>color-burn</td><td>saturation</td><td>src-atop</td></tr>
  <tr><td>hard-light</td><td>color</td><td>dst-atop </td></tr>
  <tr><td>soft-light</td><td>value</td><td>xor</td></tr>
</table>

If you are familiar with image editors such as the GIMP or Photoshop then you may recognize many of these as *layer blending modes*. They work much the same way in Mapbox Studio Classic, but do not (necessarily) operate on the style layer as a whole.

There are two ways to invoke a composite operation:

1. on an entire style layer via the `comp-op` property.
2. on a particular symbolizer via a symbolizer-specific property:
    - line-comp-op
    - line-pattern-comp-op
    - marker-comp-op
    - point-comp-op
    - polygon-comp-op
    - polygon-pattern-comp-op
    - raster-comp-op
    - shield-comp-op
    - text-comp-op

There are times when you'll want to use the style-wide `comp-op` and times when you'll want to use the symbolizer-specific properties depending on the results you want to achieve. With the symbolizer-specific approach, overlapping objects in the style will have their compositing operations applied to each other as well as the layers below. With the style-wide approach, the style will be rendered and flattened first.

<table><tr>
<td><img src='../img/compositing-style-wide.png' alt='example using style-wide' />

<pre>
// style-wide
#countries {
  line-color: #345;
  line-width: 4;
  polygon-fill: #fff;
  comp-op: overlay;
}
</pre>

</td><td><img src='../img/compositing-symbolizer-specific.png' alt='example using symbolizer-specific' />

<pre>
// symbolizer-specific
#countries {
  line-color: #345;
  line-width: 4;
  line-comp-op: overlay;
  polygon-fill: #fff;
  polygon-comp-op: overlay;
}
</pre>

</td></tr></table>

When we talk about the effects of composite operations, we need to talk about a *source* and a *destination*. The *source* is the style or symbolizer that the `comp-op` property is applied to, and the *destination* is the rest of the image that is drawn below that. There may also be more parts to the image that appear above the source; these are not affected by the comp-op and are drawn normally.

## Color blending

There are 22 color-blending compositing operations. This section will describe the ones that are most useful for cartographic design in Mapbox Studio Classic. To illustrate the differences between them all, we'll show how each of them affect a few example layers and backgrounds.

For these examples, these are the layers we'll apply the layer-wide `comp-op` properties to:

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blending-layer-1.png' alt='example of a layer' /></td>
    <td><img class='inline' src='../img/compositing-color-blending-layer-2.png' alt='example of a layer' /></td>
  </tr>
</table>

And these are the backgrounds that we will overlay the `comp-op` layers on:

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blending-overlay-1.png' alt='example of background' /></td>
    <td><img class='inline' src='../img/compositing-color-blending-overlay-2.png' alt='example of background' /></td>
  </tr>
</table>

Here's what the result looks like with no `comp-op` property applied:

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blending-result-1.png' alt='example result of overlaying' /></td>
    <td><img class='inline' src='../img/compositing-color-blending-result-2.png' alt='example result of overlaying' /></td>
  </tr>
</table>

### overlay

The `overlay` comp-op combines the colors from the source image, and also uses them to exaggerate the brightness or darkness of the destination. `overlay` is one of a few composite operations that works well for texturing, particularly for terrain data layers.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blend-overlay-1.png' alt='example using overlay' /></td>
    <td><img class='inline' src='../img/compositing-color-blend-overlay-2.png' alt='example using overlay' /></td>
  </tr>
</table>


### multiply

The `multiply` comp-op multiplies the color of the source and destination, usually resulting in a darkened image tinted to the color of the source. If either the source or destination is solid white then the result will appear unchanged. If either the source or destination is solid black then the result will also be solid black.

One of the many uses for `multiply` is to simulate the way ink colors blend with each other or with a textured surface.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blend-multiply-1.png' alt='example using multiply' /></td>
    <td><img class='inline' src='../img/compositing-color-blend-multiply-2.png' alt='example using multiply' /></td>
  </tr>
</table>

### color-dodge

The `color-dodge` comp-op brightens the colors of the destination based on the source. The lighter the source, the more intense the effect. You'll get more appealing results when using this on dark to mid-tone colors, as otherwise the colors can become too intense.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blend-color-dodge-1.png' alt='example using color-dodge' /></td>
    <td><img class='inline' src='../img/compositing-color-blend-color-dodge-2.png' alt='example using color-dodge' /></td>
  </tr>
</table>

### plus

The `plus` comp-op adds the color of the source to the destination. For example, if your source color is dark red then this operation will add a small amount of red color to the destination causing it to brighten and also turn red. The lighter your source color, the lighter your result will be because a lot of color will be added. A completely black source will not affect the destination at all because no color will be added. Using this mode on darker source layers is recommended.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blend-plus-1.png' alt='example using plus' /></td>
    <td><img class='inline' src='../img/compositing-color-blend-plus-2.png' alt='example using plus' /></td>
  </tr>
</table>

### minus

The `minus` comp-op subtracts the color of the source from the destination. For example, if your source color is a dark red, this operation will remove a small amount of red color from the destination causing it to darken and turn slightly green/blue. The lighter your source color, the darker your result will be because a lot of color will be subtracted. A completely black source will not affect the destination at all because no color will be removed. Using this mode on darker source layers is recommended.

In the example on the right, there are more polygons overlapping each other. The subtraction is run for each overlapping piece, causing areas with a lot of overlap to darken more and shift more to the green spectrum.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blend-minus-1.png' alt='example using minus' /></td>
    <td><img class='inline' src='../img/compositing-color-blend-minus-2.png' alt='example using minus' /></td>
  </tr>
</table>

### screen

The `screen` comp-op will paint white pixels from the source over the destination, but black pixels will have no affect. This operation can be useful when applied to textures or raster layers.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blend-screen-1.png' alt='example using screen' /></td>
    <td><img class='inline' src='../img/compositing-color-blend-screen-2.png' alt='example using screen' /></td>
  </tr>
</table>

### darken

The `darken` comp-op compares the individual red, green, and blue components of the source and destination and takes the lower of each. This operation can be useful when applied to textures or raster layers.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blend-darken-1.png' alt='example using darken' /></td>
    <td><img class='inline' src='../img/compositing-color-blend-darken-2.png' alt='example using darken' /></td>
  </tr>
</table>

### lighten

The `lighten` comp-op compares the individual red, green, and blue components of the source and destination and takes the higher of each.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blend-lighten-1.png' alt='example using lighten' /></td>
    <td><img class='inline' src='../img/compositing-color-blend-lighten-2.png' alt='example using lighten' /></td>
  </tr>
</table>

### color-burn

The `color-burn` comp-op darkens the colors of the destination based on the source. The darker the source, the more intense the effect.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blend-color-burn-1.png' alt='example using color-burn' /></td>
    <td><img class='inline' src='../img/compositing-color-blend-color-burn-2.png' alt='example using color-burn' /></td>
  </tr>
</table>

### hard-light

The `hard-light` comp-op will use light parts of the source to lighten the destination, and dark parts of the source to darken the destination. Mid-tones will have less effect.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blend-hard-light-1.png' alt='example using hard-light' /></td>
    <td><img class='inline' src='../img/compositing-color-blend-hard-light-2.png' alt='example using hard-light' /></td>
  </tr>
</table>

### soft-light

The `soft-light` comp-op works like a less intense version of the overlay mode. It's useful for applying texture effects or ghost images.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blend-soft-light-1.png' alt='example using soft-light' /></td>
    <td><img class='inline' src='../img/compositing-color-blend-soft-light-2.png' alt='example using soft-light' /></td>
  </tr>
</table>

### grain-merge

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blend-grain-merge-1.png' alt='example using grain-merge' /></td>
    <td><img class='inline' src='../img/compositing-color-blend-grain-merge-2.png' alt='example using grain-merge' /></td>
  </tr>
</table>

### grain-extract

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blend-grain-extra-1.png' alt='example using grain-extract' /></td>
    <td><img class='inline' src='../img/compositing-color-blend-grain-extra-2.png' alt='example using grain-extract' /></td>
  </tr>
</table>

### hue

The `hue` comp-op applies the hue of the source pixels to the destination pixels, keeping the destination saturation and value.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blend-hue-1.png' alt='example using hue' /></td>
    <td><img class='inline' src='../img/compositing-color-blend-hue-2.png' alt='example using hue' /></td>
  </tr>
</table>

### saturation

The `saturation` comp-op applies the saturation of the source pixels to the destination pixels, keeping the destination hue and value.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blend-saturation-1.png' alt='example using saturation' /></td>
    <td><img class='inline' src='../img/compositing-color-blend-saturation-2.png' alt='example using saturation' /></td>
  </tr>
</table>

### color

The `color` comp-op applies the saturation of the source pixels to the destination pixels, keeping the destination hue and value.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blend-color-1.png' alt='example using color' /></td>
    <td><img class='inline' src='../img/compositing-color-blend-color-2.png' alt='example using color' /></td>
  </tr>
</table>

### value

The `value` comp-op applies the value of the source pixels to the destination pixels, keeping the destination hue and saturation.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-color-blend-value-1.png' alt='example using value' /></td>
    <td><img class='inline' src='../img/compositing-color-blend-value-2.png' alt='example using value' /></td>
  </tr>
</table>

## Alpha blending

There are 11 alpha blending compositing operations. Rather than altering the colors of a layer, these operations use the shapes of a layer to show or hide the rest of the image in different ways.

Some of these modes will be more useful when applied to the whole style with the `comp-op` property, rather than with a symbolizer-specific property such as `polygon-comp-op`. All of the examples below were created with `comp-op`; there would be fewer differences between some of them had `polygon-comp-op` been used.

### src and dst

The `src` and `dst` composite operations show only the source and destination layers, respectively. Neither are of much use in Mapbox Studio Classic (where you can just as easily hide the layers). The `src-over` comp-op is another one you probably won't use much. It draws the source and destination normally, the same as not applying a comp-op at all. The rest of the alpha blending compositing operations may be useful for cartography, however.

### dst-over

The `dst-over` comp-op will draw the source beneath everything else. If your destination forms a solid background, this will effectively hide the source.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-alpha-blend-dst-over-1.png' alt='example of dst-over' /></td>
    <td><img class='inline' src='../img/compositing-alpha-blend-dst-over-2.png' alt='example of dst-over' /></td>
  </tr>
</table>

### src-in

The `src-in` comp-op will only draw parts of the source if they intersect with parts of the destination. The colors of the destination will not be drawn, only alpha channel (the shapes). If your destination forms a solid background, this operation will effectively be the same as `src`, since all parts of the source will intersect with the destination.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-alpha-blend-src-in-1.png' alt='example of src-in' /></td>
    <td><img class='inline' src='../img/compositing-alpha-blend-src-in-2.png' alt='example of src-in' /></td>
  </tr>
</table>

### dst-in

The `dst-in` comp-op will only draw parts of the destination that intersect with parts of the sources. The colors of the source will not be drawn, only the alpha channel (the shapes). If your source is completely solid, this operation will effectively be the same as `dst`, since all parts of the destination will intersect with the source.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-alpha-blend-dst-in-1.png' alt='example of dst-in' /></td>
    <td><img class='inline' src='../img/compositing-alpha-blend-dst-in-2.png' alt='example of dst-in' /></td>
  </tr>
</table>

### src-out

The `src-out` comp-op will only draw parts of the source that **don't** intersect parts of the destination. The colors of the destination won't be drawn, only alpha channel (the shapes). If your destination forms a solid background, this operation will completely hide both the source and the destination, since all parts of the source intersect the destination.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-alpha-blend-src-out-1.png' alt='example of src-out' /></td>
    <td><img class='inline' src='../img/compositing-alpha-blend-src-out-2.png' alt='example of src-out' /></td>
  </tr>
</table>

### dst-out

The `dst-out` comp-op will only draw parts of the destination that **don't** intersect parts of the source. The colors of the source won't be drawn, only alpha channel (the shapes). If your source is completely solid then this operation will completely hide both the source and the destination, since all parts of the source intersect the destination.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-alpha-blend-dst-out-1.png' alt='example of dst-out' /></td>
    <td><img class='inline' src='../img/compositing-alpha-blend-dst-out-2.png' alt='example of dst-out' /></td>
  </tr>
</table>

### src-atop

The `src-atop` comp-op will only draw the source where it intersects with the destination. It will also draw the entire destination. If your destination forms a solid background, the result will be the same as `src-over` (or no comp-op at all).

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-alpha-blend-src-atop-1.png' alt='example of src-atop' /></td>
    <td><img class='inline' src='../img/compositing-alpha-blend-src-atop-2.png' alt='example of src-atop' /></td>
  </tr>
</table>

### sst-atop

The `dst-atop` comp-op will only draw the destination on top of the source, but only where the two intersect. All parts of the source will be drawn, but below the destination. If your destination forms a solid background, no part of the source will be visible.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-alpha-blend-sst-atop-1.png' alt='example of sst-atop' /></td>
    <td><img class='inline' src='../img/compositing-alpha-blend-sst-atop-2.png' alt='example of sst-atop' /></td>
  </tr>
</table>

### xor

The `xor` comp-op means *exclusive or*. It will only draw parts of the source and destination that **don't** overlap each other. If either your source or your destination forms a solid layer, neither will be drawn because there are no non-overlapping parts.

<table>
  <tr>
    <td><img class='inline' src='../img/compositing-alpha-blend-xor-1.png' alt='example of xor' /></td>
    <td><img class='inline' src='../img/compositing-alpha-blend-xor-2.png' alt='example of xor' /></td>
  </tr>
</table>
