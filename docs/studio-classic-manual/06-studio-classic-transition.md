# Transition to Mapbox Studio

Mapbox Studio Classic has been replaced by [Mapbox Studio](https://www.mapbox.com/studio/), an improved and expanded editor that offers more design control with an easier-to-use interface.

## Where are my projects and styles?

You can access your Mapbox Editor projects, Studio Classic styles, and Tilemill styles in [**Mapbox Studio**](https://www.mapbox.com/studio/). Click the [**Classic styles and Editor projects**](https://www.mapbox.com/studio/classic/) tab section.

Classic styles and projects will stay online and continue to work in websites and applications, but cannot be edited in Mapbox Studio.

## Where is my data?

You can access your Mapbox Classic tilesets from [**Mapbox Studio**](https://www.mapbox.com/studio/tilesets/). You cannot access your raw data in Mapbox Studio. When you upload data from Mapbox Studio Classic to your Mapbox account, it is stored only as tilesets.

## Is Mapbox Studio Classic still available?

Mapbox Studio Classic is no longer the recommended way to create maps on Mapbox. However, you can install and configure Studio Classic on your own using the instructions on [Mapbox's Studio Classic GitHub repository](https://github.com/mapbox/mapbox-studio-classic).

## Can I use vector tile sources from Mapbox Studio Classic in Mapbox Studio?

Yes, the vector tile format used by Mapbox Studio Classic is the same as the vector tiles that power Mapbox Studio. You can use any vector tile data sources you've created in Mapbox Studio Classic as data in Mapbox Studio.

## Can I use Mapbox Studio Classic styles in Mapbox Studio?

No. Mapbox Studio uses the [Mapbox Style Specification](https://www.mapbox.com/mapbox-gl-style-spec/), which is incompatible with CartoCSS, the language used by Mapbox Studio Classic. There is no automatic method to convert one from the other. We recommend recreating Classic styles in Mapbox Studio. To get started with the Mapbox Studio style editor see the [Mapbox Studio Manual](https://www.mapbox.com/studio-manual/reference/styles/) and the [Create a custom style](https://www.mapbox.com/help/create-a-custom-style/) tutorial.

## Can I export images for print from Mapbox Studio?

While Mapbox Studio does not have high-resolution export feature, you can use the [Static API](https://www.mapbox.com/help/define-static-api/) to get an image of your map style. Read more about static maps in the [Static and print maps guide](https://www.mapbox.com/help/how-static-maps-work/).
