# PostGIS manual

Sometimes you need more data processing power. We recommend housing your larger data sets in a PostgreSQL database with a PostGIS extension. This allows you to upload massive data sets and will provide much more flexibility for querying that data with SQL in Mapbox Studio Classic.

This tutorial will walk you through using PostGIS and SQL in Mapbox Studio Classic to build vector tiles.

## Getting started

Before you begin, you'll need to install PostgreSQL and PostGIS and add our PostGIS Vector Tile Utility.

### Install PostgreSQL and PostGIS

If you're new to PostGIS, you will need to:

1. Download and install [PostgreSQL](http://www.postgresql.org/download/).
2. Install a [PostGIS extension](http://postgis.net/install/) to your PostgreSQL database.

### Add our PostGIS Vector Tile utility

For some of the examples in this guide, you will need to add our vector tile helper utility, [postgis-vt-util](https://github.com/mapbox/postgis-vt-util) into your database. The utility provides a set of custom PostgreSQL functions that aid in managing your vector tile sources into Mapbox Studio Classic.

To add `postgis-vt-util` to your PostgreSQL database:

1. Download [postgis-vt-util.sql](https://raw.githubusercontent.com/mapbox/postgis-vt-util/master/postgis-vt-util.sql).
2. Load `postgis-vt-util.sql` to your database with a command like this:

```sh
psql -U <username> -d <dbname> -f postgis-vt-util.sql
```

## Import data into PostGIS

If your data isn't already managed in a PostGIS database, you'll need to import it. It's a good idea to script this process so that you can repeat it later or collaborate on the project without sharing access to the same database.

`ogr2ogr` is the most versatile utility to get any kind of vector geodata into PostGIS. If you have a lot of data, you may want to look into `shp2pgsql`, which can import data much more quickly.

### Basic ogr2ogr example

The following command will create a PostgreSQL table with all the same columns as your Shapefile, plus a `wkb_geometry` column for the geometries. The geometry column will be automatically indexed for efficient spatial queries.

The `-t_srs EPSG:3857` part makes sure your data is projected to Web Mercator which is the projection that the final vector tiles will be.

```sh
ogr2ogr \
    -f PostgreSQL \
    -t_srs EPSG:3857 \
    PG:'user=postgres host=localhost dbname=your_db' \
    your_data.shp
```

### Multiple files into one table

Since many of your layers were comprised of many Shapefiles, you can use this command to import them all to a single table.

```sh
files=(
    file_1.shp
    file_2.shp
)
for file in ${files[@]}; do
    ogr2ogr \
        -append \
        -f PostgreSQL \
        -t_srs EPSG:3857 \
        PG:'user=postgres host=localhost dbname=your_db' \
        $file
done
```

## SQL queries in Mapbox Studio Classic

Once these Shapefiles are loaded into a database, you can write SQL queries to bring them down to a desired zoom level and filter keep each zoom level at 500 MB. Refer to the SQL queries in your data.yml file for the specific code.

Here's an overview of the Mapnik and `postgis-vt-util` functions you need to know.

### Basic query

This example includes all geometries from a table at all zoom levels.

```sql
( SELECT * FROM table_name ) AS data
```

### Using spatial indexes effectively

The SQL queries in a Mapbox Studio Classic source project are run once for each tile you export, so making sure that these queries run quickly is they key to efficient exports. One of the best ways to speed up a query is to make sure it's only looking at features that will actually be visible in the given tile using spatial indexes generated when you imported your data. By default, an attempt at this is made behind-the-scenes, but for more complex queries you'll need to ensure this manually.

```sql
( SELECT * FROM table_name
  WHERE wkb_geometry && !bbox!
) AS data
```

Assuming `wkb_geometry` is your geometry column, this query will only select features whose geometries have bounding boxes that intersect with the tile the query is being run for. Behind the scenes, `!bbox!` is replaced with a polygon representing the area covered by each tile.

### Limiting data by zoom level

If you have a layer that's not needed at every zoom level, you can craft your query to limit the selection based on the zoom level. This will require the `z()` function provided by the [postgis-vt-util](https://github.com/mapbox/postgis-vt-util) package. This also makes for smaller, more efficient tiles.

```sql
( SELECT * FROM table_name
  WHERE z(!scale_denominator!) >= 6
  AND wkb_geometry && !bbox!
) AS data
```

It's good practice to include the *avoid spatially-irrelevant clause* mentioned above after your `WHERE` clause. To do this, add an `AND` statement to tack on that filter.

### Controlling label density

Point data needs to be controlled because in some locations you may have hundreds of points geographically close to each other or even on top of each other. These dense areas mean that certain vector tiles will be very heavy, but Mapbox Studio Classic will render them just the same. Now imagine what happens when you zoom out to low zoom levels, again these dense areas become problematic when they're combined with a CartoCSS style and used to generate a raster tile.

If you have ever uploaded Mapbox Studio Classic style to Mapbox.com and are met with an error like `Drawtime avg. exceeded limit of 300ms` or `Drawtime max exceeded limit of 1000ms` it's likely that the style is using vector tiles that are too dense and are requiring `Mapnik` to do too much work to generate PNG tiles.

`labelgrid` lets you control the density of label points by dividing each tile into an imaginary grid and only allowing one label per grid cell. You can adjust the density by changing the dimensions of the grid.

```sql
( SELECT * FROM (
    SELECT DISTINCT ON(labelgrid(wkb_geometry, 64,!pixel_width!)) *
    FROM populated_places
    ORDER BY labelgrid(wkb_geometry, 64,!pixel_width!), population DESC NULLS LAST, id
  ) AS ordered
  ORDER BY population DESC NULLS LAST, id
) AS data
```

There are a number of things going on in this query.

- The `labelgrid` function only returns a unique string for each grid cell on the map - two geometries in the same cell will get the same result from this function. This string is used in the `DISTINCT ON` portion of the query to produce only one result per cell.
- The `ORDER BY` sections ensure that the correct geometries are being prioritized - in this case places with the highest populations.
- The `id` included in the `ORDER BY` is there to ensure consistent ordering every time the query is run. If two nearby places have the same population, PostgreSQL will not always return things in a consistent order unless you force it with a final column in the `ORDER BY` that has a unique value for every object.

### Multiple tables in one layer

Sometimes your source data may be broken up more than necessary and you want to include multiple tables in one layer for easier styling. As long as you can make the columns for all the tables consistent, you can do this with `UNION ALL`.

We're also using the `z()` function and `!bbox!` token explained in previous examples.

```sql
( SELECT wkb_geometry, area
  FROM ponds
  WHERE z(!scale_denominator!) >= 10
    AND wkb_geometry && !bbox!
) UNION ALL (
  SELECT wkb_geometry, area
  FROM lakes
  WHERE z(!scale_denominator!) >= 6
    AND wkb_geometry && !bbox!
) UNION ALL (
  SELECT wkb_geometry, area
  FROM oceans
  WHERE wkb_geometry && !bbox!
) AS data
```
