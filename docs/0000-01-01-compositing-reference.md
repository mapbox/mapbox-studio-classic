Compositing reference
=====================

Compositing operations affect the way colors and textures of different elements and styles interact with each other.

Without any compositing operations on a source it will just be painted directly over the destination -- compositing operations allow us to change this. There are 33 compositing operations available in CartoCSS:

<table class='space-bottom'>
  <tr><td> plus        </td><td> difference    </td><td> src      </td></tr>
  <tr><td> minus       </td><td> exclusion     </td><td> dst      </td></tr>
  <tr><td> multiply    </td><td> contrast      </td><td> src-over </td></tr>
  <tr><td> screen      </td><td> invert        </td><td> dst-over </td></tr>
  <tr><td> overlay     </td><td> invert-rgb    </td><td> src-in   </td></tr>
  <tr><td> darken      </td><td> grain-merge   </td><td> dst-in   </td></tr>
  <tr><td> lighten     </td><td> grain-extract </td><td> src-out  </td></tr>
  <tr><td> color-dodge </td><td> hue           </td><td> dst-out  </td></tr>
  <tr><td> color-burn  </td><td> saturation    </td><td> src-atop </td></tr>
  <tr><td> hard-light  </td><td> color         </td><td> dst-atop </td></tr>
  <tr><td> soft-light  </td><td> value         </td><td> xor      </td></tr>
</table>

The operations in the first two columns are color blending modes that provide a variety of ways to control the blending of the colors of objects and layers with each other. The operations in the last column are [Duff-Porter alpha blending modes](http://www.imagemagick.org/Usage/compose/#duff-porter). They provide a variety of ways to fill and mask objects and layers with each other.

If you are familiar with image editors such as the GIMP or PhotoShop you will recognize many of these as layer blending modes. They work much the same way in Mapbox Studio, but do not (necessarily) operate on the layer as a whole. There are two ways to invoke a composite operation - on an entire style attachment via the `comp-op` property, or on a particular symbolizer via a symbolizer-specific property:

- line-comp-op
- line-pattern-comp-op
- marker-comp-op
- point-comp-op
- polygon-comp-op
- polygon-pattern-comp-op
- raster-comp-op
- shield-comp-op
- text-comp-op

There are times when you'll want to use the style-wide `comp-op` and times when you'll want to use the symbolizer-specific properties. It will depend on the results you want to achieve. With the symbolizer-specific approach, overlapping objects in the style will have their compositing operations applied to each other as well as the layers below. With the style-wide approach, the style will be rendered and flattened first.

<table class='space-bottom'><tr>
<td><img src='https://cloud.githubusercontent.com/assets/83384/3881031/1d351f02-218a-11e4-8092-10002ca9ff2b.png' />
<pre>
// style-wide
#countries {
  line-color: #345;
  line-width: 4;
  polygon-fill: #fff;
  comp-op: overlay;
}
</pre></td><td><img src='https://cloud.githubusercontent.com/assets/83384/3881032/1d416118-218a-11e4-99e9-e29173c8b169.png' />
<pre>
// symbolizer-specific
#countries {
  line-color: #345;
  line-width: 4;
  line-comp-op: overlay;
  polygon-fill: #fff;
  polygon-comp-op: overlay;
}
</pre></td></tr></table>

*Note*: When we talk about the effects of composite operations, we need to talk about a *source* and a *destination*. The *source* is the style or symbolizer that the `comp-op` property is applied to, and the *destination* is the rest of the image that is drawn below that. There may also be more parts to the image that appear above the source; these are not affected by the comp-op and are drawn normally.

## Color Blending

There are 22 color-blending compositing operations. This section will describe the ones that are most useful for cartographic design in Mapbox Studio. To illustrate the differences between them all, we'll show how each of them affect a few example layers and backgrounds.

These are the layers the `comp-op` properties will be applied to:

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881387/233691b2-218d-11e4-992f-3e58df40febd.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881393/234c2e32-218d-11e4-846c-e92949653007.png' />
</div>

These are the backgrounds the `comp-op` layers will be overlaid on:

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881341/22ac38c8-218d-11e4-8e3a-52f3b5e4e048.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881342/22ac91d8-218d-11e4-9f95-c5ecf675a608.png' />
</div>

Here is what the result looks like with no `comp-op` property applied:

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881398/236277aa-218d-11e4-813d-418292c58223.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881397/2359adbe-218d-11e4-9cfe-40aba11df42b.png' />
</div>

### Overlay

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881377/2318eef0-218d-11e4-94c0-0c58a5995a33.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881381/2326cb06-218d-11e4-9295-92c99e33eac3.png' />
</div>

The `overlay` comp-op combines the colors from the source image, and also uses them to exaggerate the brightness or darkness of the destination. Overlay is one of a few composite operations that works well for texturing, including using it for terrain data layers.

### Multiply

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881379/231d32ee-218d-11e4-9627-cc17d776f0a3.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881376/23164fba-218d-11e4-9913-7d37b4ce98bd.png' />
</div>

The `multiply` comp-op multiplies the color of the source and destination, usually resulting in a darkened image tinted to the color of the source. If either the source or destination is solid white, the other will appear unchanged. If either the source or destination is solid black, the result will also be solid black.

One of the many uses for multiply is to simulate the way ink colors would blend with each other or with a textured surface. It can also be used for other kinds of texure effects.

### Color-dodge

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881330/228f3ea8-218d-11e4-9a26-d9c6c501f4ec.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881334/2296b2b4-218d-11e4-9ca7-a5ac240da41e.png' />
</div>

The `color-dodge` comp op brightens the colors of the destination based on the source. The lighter the source, the more intense the effect. You'll get nicer results when using this on dark to mid-tone colors, otherwise the colors can become too intense.

### Plus

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881380/2321f054-218d-11e4-9ca6-94594a077f3a.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881383/23286c2c-218d-11e4-97ef-c252e411b007.png' />
</div>

The `plus` comp-op adds the color of the source to the destination. For example, if your source color is dark red, this operation will add a small amount of red color to the destination causing it to brighten and also turn red. The lighter your source color, the lighter your result will be because a lot of color will be added. A completely black source will not affect the destination at all because no color will be added. Using this mode on darker source layers is recommended.

### Minus

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881374/230be6c4-218d-11e4-86c3-220891079924.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881375/230e6962-218d-11e4-9cf5-485a1a7a355d.png' />
</div>

The `minus` comp-op subtracts the color of the source from the destination. For example, if your source color is a dark red, this operation will remove a small amount of red color from the destination causing it to darken and turn slightly green/blue. The lighter your source color, the darker your result will be because a lot of color will be subtracted. A completely black source will not affect the destination at all because no color will be removed. Using this mode on darker source layers is recommended.

In the bathymetry example above there are more polygons overlapping each other. The subtraction is run for each overlapping piece, causing areas with a lot of overlap to darken more and shift more to the green spectrum.

### Screen

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881386/23350540-218d-11e4-9053-a73c7e524e24.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881384/2331a3f0-218d-11e4-9982-d96365a72c9d.png' />
</div>

The `screen` comp-op will paint white pixels from the source over the destination, but black pixels will have no affect. This operation can be useful when applied to textures or raster layers.

### Darken

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881336/229dba14-218d-11e4-9750-369326b72e7f.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881339/22a5153e-218d-11e4-9c84-4adc8d80f5fc.png' />
</div>

The `darken` comp-op compares the individual red, green, and blue components of the source and destination and takes the lower of each. This operation can be useful when applied to textures or raster layers.

### Lighten

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881372/2306ffec-218d-11e4-8a9a-16ce1357e9f5.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881373/230a2758-218d-11e4-8ed7-219d8b04882a.png' />
</div>

The `lighten` comp-op compares the individual red, green, and blue components of the source and destination and takes the higher of each.

### Color-burn

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881332/2290e28a-218d-11e4-8b95-fc62ab495ed9.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881333/2295bd78-218d-11e4-957e-c9076d47dccf.png' />
</div>

The `color-burn` comp op darkens the colors of the destination based on the source. The darker the source, the more intense the effect.

### Hard-light

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881364/22ec6f92-218d-11e4-8c25-fa4691a457e6.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881365/22f03b54-218d-11e4-8d2b-afcb577fee0f.png' />
</div>

The `hard-light` comp-op will use light parts of the source to lighten the destination, and dark parts of the source to darken the destination. Mid-tones will have less effect

### Soft-light

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881389/233a064e-218d-11e4-8b11-1f21caa0e5ed.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881388/23372320-218d-11e4-84b6-75eec4af462f.png' />
</div>

The `soft-light` comp-op works like a less intense version of the overlay mode. It is useful for applying texture effects or ghost images.

### Grain-merge

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881361/22e3dcf6-218d-11e4-9e56-90f7aeb94367.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881362/22e97792-218d-11e4-9082-f8a8ca814d5b.png' />
</div>

### Grain-extract

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881358/22db97a8-218d-11e4-9157-d913f9b523f8.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881363/22eb42ac-218d-11e4-97c5-bb8d9fb16e8d.png' />
</div>

### Hue

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881366/22f57876-218d-11e4-96e1-88fb26a181c6.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881367/22f64c9c-218d-11e4-9798-e1cdf719502b.png' />
</div>

The `hue` comp-op applies the hue of the source pixels to the destination pixels, keeping the destination saturation and value.

### Saturation

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881382/2327d55a-218d-11e4-9056-620382c07de3.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881385/233295da-218d-11e4-87c4-9922c2bd9c22.png' />
</div>

The `saturation` comp-op applies the saturation of the source pixels to the destination pixels, keeping the destination hue and value.

### Color

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881331/228fddf4-218d-11e4-87a5-d98f1ef742f7.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881329/228b0f22-218d-11e4-80da-4d1ef13490a0.png' />
</div>

The `color` comp-op applies the saturation of the source pixels to the destination pixels, keeping the destination hue and value.

### Value

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881399/2363996e-218d-11e4-866c-acfdda0d7e0e.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881402/2368f206-218d-11e4-9f13-3ab2e694f92f.png' />
</div>

The `value` comp-op applies the value of the source pixels to the destination pixels, keeping the destination hue and saturation.

## Alpha Blending

There are 11 alpha blending compositing operations. Rather than altering the colors of a layer, these operations use the shapes of a layer to show or hide the rest of the image in different ways.

Some of these modes will be more useful when applied to the whole style with the `comp-op` property, rather than with a symbolizer-specific property such as `polygon-comp-op`. All of the examples below were created with `comp-op`; there would be fewer differences between some of them had `polygon-comp-op` been used.

The `src` and `dst` composite operations show only the source and destination layers, respectively. Neither are of much use in Mapbox Studio (where you can just as easily hide the layers). The `src-over` comp-op is another one you won't be uding much. It draws the source and destination normally, the same as not applying a comp-op at all. The rest of the alpha blending compositing operations may be useful for cartography, however.

### Dst-over

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881350/22c57d1a-218d-11e4-9e97-ccb28a19d971.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881351/22c7d876-218d-11e4-9002-11ba7ca66adc.png' />
</div>

The `dst-over` comp-op will draw the source beneath everything else. If your destination forms a solid background, this will effectively hide the source.

### Src-in

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881394/234dd5a2-218d-11e4-8bfa-279ce07573f8.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881392/2349ad74-218d-11e4-84e7-3e6f9261bbdf.png' />
</div>

The `src-in` comp-op will only draw parts of the source if they intersect with parts of the destination. The colors of the destination will not be drawn, only alpha channel (the shapes). If your destination forms a solid background, this operation will effectively be the same as `src`, since all parts of the source will intersect with the destination.

### Dst-in

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881344/22b87980-218d-11e4-891d-cfd326d518ef.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881346/22bcd0de-218d-11e4-8a10-30df1c5fa612.png' />
</div>

The `dst-in` comp-op will only draw parts of the destination that intersect with parts of the sources. The colors of the source will not be drawn, only the alpha channel (the shapes). If your source is completely solid, this operation will effectively be the same as `dst`, since all parts of the destination will intersect with the source.

### Src-out

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881396/2354f404-218d-11e4-8568-49f82ca4162f.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881395/2354c0d8-218d-11e4-936e-bce3adf1f3fd.png' />
</div>

The `src-out` comp-op will only draw parts of the source that do *not* intersect parts of the destination. The colors of the destination will not be drawn, only alpha channel (the shapes). If your destination forms a solid background, this operation will completely hide both the source and the destination, since all parts of the source intersect the destination.

### Dst-out

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881347/22bde7a8-218d-11e4-832d-538c601a88f3.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881349/22be78da-218d-11e4-980f-ed4073e842ff.png' />
</div>

The `dst-out` comp-op will only draw parts of the destination that do *not* intersect parts of the source. The colors of the source will not be drawn, only alpha channel (the shapes). If your source is completely solid, this operation will completely hide both the source and the destination, since all parts of the source intersect the destination.

### Src-atop

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881390/23448290-218d-11e4-87cb-9959b68357fc.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881391/2345454a-218d-11e4-9f3b-b94b6d97c3b3.png' />
</div>

The `src-atop` comp-op will only draw the source where it intersects with the destination. It will also draw the entire destination. If your destination forms a solid background, the result will be the same as `src-over` (or no comp-op at all).

### Dst-atop

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881343/22b63abc-218d-11e4-989d-998bd386dbdf.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881345/22bafc78-218d-11e4-9fc2-8bf14c5cd158.png' />
</div>

The `dst-atop` comp-op will only draw the destination on top of the source, but only where the two intersect. All parts of the source will be drawn, but below the destination. If your destination forms a solid background, no part of the source will be visible.

### Xor

<div class='center'>
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881400/2366cd96-218d-11e4-9047-afacbbec5a53.png' />
    <img class='inline' src='https://cloud.githubusercontent.com/assets/83384/3881401/2367757a-218d-11e4-8460-9fc2e5c50e42.png' />
</div>

The `xor` comp-op means 'exclusive or'. It will only draw parts of the source and destination that do *not* overlap each other. If either your source or your destination forms a solid layer, neither will be drawn because there are no non-overlapping parts.
