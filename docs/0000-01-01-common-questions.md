Common questions
================

- [What are vector tiles?](#what-are-vector-tiles)
- [What is the difference between style and source projects?](#what-is-the-difference-between-style-and-source-projects)
- [Can I use git with a style or source project?](#can-i-use-git-with-a-style-or-source-project)
- [Do I need a Mapbox account to use Mapbox Studio?](#do-i-need-a-mapbox-account-to-use-mapbox-studio)
- [What can/can't I do with pro fonts?](#what-cancant-i-do-with-pro-fonts)
- [How is Mapbox Studio related to TileMill?](#how-is-mapbox-studio-related-to-tilemill)
- [How is Mapbox Studio related to Mapbox GL?](#how-is-mapbox-studio-related-to-mapbox-gl)

What are vector tiles?
----------------------

Vector tiles are the vector data equivalent of image tiles for web mapping. They apply the strengths of tiling -- developed for caching, scaling and serving map imagery rapidly -- to vector data. Consider an image tile at the `zxy` coordinate `14/4823/6160`. This image is a PNG that depicts the corner of lower Manhattan with roads, building footprints, and parks:

![z14 image tile](https://cloud.githubusercontent.com/assets/83384/3870695/97169564-20d9-11e4-8cc2-b2b75963fd5d.png)

A vector tile at `14/4823/6160` would contain all the corresponding geometries and metadata -- like road names, area types, building heights -- in a compact, parsable format. Vector tiles are a highly performant format that provide greater flexibility in terms of styling, output format, and interactivity.

What is the difference between style and source projects?
---------------------------------------------------------

Mapbox Studio makes a hard split between two types of projects:

- **Style projects** contain stylesheets, basic thin metadata (name, description, attribution, etc.), and a *reference* to a source.
- **Source projects** contain configuration for converting a traditional geodata storage format (Shapefile, GeoJSON, etc.) into vector tiles. Once converted into vector tiles the source can be referenced by style projects for styling.

<div class='clearfix space-bottom'>
    <div class='margin2 col8'>
        <div class='clearfix mobile-cols space-bottom1'>
            <div class='col6 center round-left fill-blue pad2 icon document'>
                HTML
            </div>
            <div class='col6 center round-right fill-purple pad2 icon pencil'>
                CSS
            </div>
        </div>
        <div class='clearfix mobile-cols space-bottom1'>
            <div class='col6 center round-left fill-blue pad2 icon polygon'>
                Source
            </div>
            <div class='col6 center round-right fill-purple pad2 icon paint'>
                Style
            </div>
        </div>
    </div>
    <div class='margin2 col8 small center'>
        <em>Mapbox Studio styles have a similar relation to sources as the relationship between CSS stylesheets and HTML documents</em>
    </div>
</div>

Can I use git with a style or source project?
---------------------------------------------

Yes and we recommend it. Each style and source project is a directory containing multiple files. Making a project a git repo and keeping all its assets (stylesheets, metadata, icons, textures) under version control lets you track your changes, try out new ideas in branches and revert commits you don't like.

Check out the [OSM bright repository](https://github.com/mapbox/osm-bright.tm2) for an example style that is on GitHub.

Do I need a Mapbox account to use Mapbox Studio?
------------------------------------------------

Yes, a Mapbox account is needed to access the default vector tile sources included in Mapbox Studio. You can try out the features of Mapbox Studio for free but to make use of all of the functionality you must be on the Mapbox [Standard plan](https://www.mapbox.com/plans/).

You are not locked into using Studio with Mapbox -- you can export vector tiles from any source project as a standard [MBTiles file](https://github.com/mapbox/mbtiles-spec) and package any style project as a [`.tm2z` package](https://github.com/mapbox/tilelive-vector).

What can/can't I do with pro fonts?
-----------------------------------

Mapbox Studio includes over 300 pro fonts licensed from [FontShop](http://www.fontshop.com/) and [Monotype](http://www.monotype.com/) for use exclusively with the app.

**You may:**

- Use pro fonts style projects you design in Mapbox Studio,
- Publish styles using pro fonts to your Mapbox account,
- Print/export static images from style projects using pro fonts.

**You may not:**

- Copy or redistribute pro fonts font files outside of the Mapbox Studio app,
- Make use of pro fonts in a fork or derivative copy of Mapbox Studio,
- Include pro fonts in maps you publish that are not through your Mapbox account.

How is Mapbox Studio related to TileMill?
-----------------------------------------

Mapbox Studio is a new map design application from Mapbox. It is powered exclusively by vector tiles and aims to fully replace and improve upon TileMill in functionality.

### Similarities

- **Open source**. Mapbox Studio is an open source project with [all its code on GitHub](https://github.com/mapbox/mapbox-studio).
- **CartoCSS-based styling**. Mapbox Studio leverages the same CartoCSS language and Mapnik rendering backend used by TileMill.
- **Broad geodata format support**. Mapbox Studio supports Shapefile, GeoJSON, CSV, PostGIS, and more, just like TileMill.

### Differences

- **Powered by vector tiles**. This makes styling fast, allows anyone to work with huge global datasets, and deploy changes to styles in seconds.
- **Resolution independent**. Vector-tile based style projects can be displayed on retina devices and be used for 600dpi printing in ways normal map image tiles cannot.

How is Mapbox Studio related to Mapbox GL?
------------------------------------------

Mapbox Studio is a predecessor to Mapbox GL in terms of rendering technology. Both platforms are powered by the same [Mapnik vector tile](https://github.com/mapbox/mapnik-vector-tile) format, but Mapbox Studio renders maps using Mapnik as its backend while Mapbox GL uses GPU-based rendering.

The vector tiles created by Mapbox Studio in the _Source editor_ can be used directly with Mapbox GL. As Mapbox GL rendering matures expect Mapbox Studio to begin transitioning its rendering to leverage GL as well.

