Styling polygons
================

Polygons are areas that can be filled with a solid color or a pattern, and also given an outline.

_Tip: everything covered in the styling lines guide can also be applied to polygon layers._

## Basic Styling

The simplest polygon style is a solid color fill.

![](https://cloud.githubusercontent.com/assets/126952/3908623/6d6b3c32-2305-11e4-9cff-9404f8f07bd1.png)

    #landuse[class='park'] {
      polygon-fill: #bda;
    }

If you want to  adjust the opacity of a polygon-fill you can use the `polygon-opacity` property. This is a number between 0 and 1 - 0 being fully transparent and 1 being fully opaque. With 50% opacity we can see overlapping shapes in the same layer add together to create more opaque areas.

![](https://cloud.githubusercontent.com/assets/126952/3908624/6d70d9d0-2305-11e4-92f2-abb819844509.png)

    #landuse[class='park'] {
      polygon-fill: #bda;
      polygon-opacity: 0.5;
    }

### Gaps and Gamma

![](https://cloud.githubusercontent.com/assets/126952/3908625/6d784346-2305-11e4-8755-d45d61d35583.png)

When you have a layer containing polygons that should fit together seamlessly, you might notice subtle gaps between them at certain scales. You can use the `polygon-gamma` style to help reduce this effect. Gamma takes a value between 0 and 1 - the default is 1, so try lowering it to hide the gaps. Be careful about setting it too low, though. You'll get jagged edges and possibly even stranger artifacts.

![](https://cloud.githubusercontent.com/assets/126952/3908627/6d80f612-2305-11e4-80f4-6803335295c3.png)

    #water {
      polygon-fill: #acf;
      polygon-gamma: 0.5;
    }

## Patterns and Textures

With CartoCSS, you can easily fill areas with textures and patterns by bringing in external images. You might create the patterns yourself in image editing software, or find ready-made images from resource websites such as [Subtle Patterns](http://subtlepatterns.com/thumbnail-view/) or [Free Seamless Textures](http://freeseamlesstextures.com/).

You can add a pattern style from any local file or web URL using the `polygon-pattern-file` style. Here is a simple diagonal stripe pattern you can use to try out - you can reference it from CartoCSS as in the snippet below.

![pattern-stripe](https://cloud.githubusercontent.com/assets/83384/3893834/32389e24-223e-11e4-8ec6-163fd55d6622.png)

![](https://cloud.githubusercontent.com/assets/126952/3908626/6d7970cc-2305-11e4-88b9-0219470cd157.png)

    #landuse[class='park'] {
      polygon-pattern-file: url("pattern-stripe.png");
    }


In order to have patterns work when your style is uploaded to Mapbox they will need to be stored in the style project folder (this is the folder ending in `.tm2` that's created when you "Save As" a style project). If your project uses a lot of images you can create a subdirectory in the `.tm2` folder and include that in the URL. For example, if you create a subdirector named `images`:

    #landuse[class='park'] {
      polygon-pattern-file: url("images/pattern-stripe.png");
    }

### Background patterns

If you want to add a pattern image to the background of the whole map, you can use the `background-image` property on the `Map` object.

    Map {
      background-image: url("pattern.png");
    }

Like all other properties on the Map object, background-image has a global effect - it cannot be filtered or changed depending on zoom level.

### Combining patterns & fills

Using transparency or compositing operations it is possible to get a lot of variety out of a single pattern image.

### Ensuring seamlessness

There are two types of pattern alignment: local (the default) and global (specified with `polygon-pattern-alignment: global;`).

When a pattern style has local alignment, that means that the pattern will be aligned separately for each polygon it is applied to. The top-left corner of the pattern image will be aligned to the top-left corner of a polygon's bounding box.

When a pattern style has global alignment, pattern images are aligned to the image tile instead of the individual geometries. Thus a repeated pattern will line up across all of the polygons it is applied to. With global alignment, pattern images should not be larger than the metatile (excluding the buffer), otherwise portions of the pattern will never be shown.

Another important thing to keep in mind is with globally-aligned patterns is that the pixel dimensions of the image file must multiply evenly up to the width and height of the tile, 256×256 pixels. Your pattern width or height dimentions could be 16 or 32 or 128, but should not 20 or 100 or any other number you can't evenly divide 256 by. If you are using patterns from a resource website, you may need to resize them in an image editor to conform to this limitation.
