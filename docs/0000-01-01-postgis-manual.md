# PostGIS + SQL in Mapbox Studio

Got a large collection of custom data? Need more processing power to make [vector tiles](https://www.mapbox.com/developers/vector-tiles/) upload smoothly to Mapbox.com? Look no further than PostGIS + SQL in Mapbox Studio.

![datasource](https://cloud.githubusercontent.com/assets/4587826/5863497/fe256a2e-a247-11e4-98d3-02b7a788da75.png)

Sometimes you just need more data processing power. We highly recommend housing your larger data sets into a PostgreSQL database with a PostGIS extension. This allows you to upload massive data sets and will provide much more flexibility for querying that data with SQL in Studio.

## Getting started

### Install PostgreSQL and PostGIS

If you're new to PostGIS, you will need to download and install [PostgreSQL](http://www.postgresql.org/download/) then install a [PostGIS extension](http://postgis.net/docs/postgis_installation.html#install_short_version) to your PostgreSQL database.


### Add our PostGIS Vector Tile utility

For some of the examples below you will also need to add our vector tile helper utility, [postgis-vt-util](https://github.com/mapbox/postgis-vt-util), into your database. This provides a set of custom PostgreSQL functions that aid in managing your vector tile sources into Mapbox Studio.

To add `postgis-vt-util` into your PostgreSQL database, download [lib.sql](https://raw.githubusercontent.com/mapbox/postgis-vt-util/master/lib.sql) then load `lib.sql` to your database with a command like this:

    psql -U postgres -d your_db -f lib.sql


## Importing data into PostGIS

If your data is not already managed in a PostGIS database, you will need to import it. It's a good idea to script this process so that you can easily repeat the process again later or collaborate on the project without sharing access to the same database.

For getting any kind of vector geodata into PostGIS in an automated fashion, `ogr2ogr` is probably the simplest and most versatile utility. If you have a lot of data, you may want to look into `shp2pgsql` which is more finicky but can import data much more quickly.

### Basic ogr2ogr example

The following command will create a PostgreSQL table with all the same columns as your Shapefile, plus a `wkb_geometry` column for the geometries. The geometry column will be automatically indexed for efficient spatial queries.

The `-t_srs EPSG:3857` part makes sure your data is projected to Web Mercator, which is what you'll usually want since that's what the final vector tiles will be.

    ogr2ogr \
        -f PostgreSQL \
        -t_srs EPSG:3857 \
        PG:'user=postgres host=localhost dbname=your_db' \
        your_data.shp

### Multiple files into one table

Since many of your layers were comprised of many shapefiles, we used this format to easily import them all to a single table.


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

## SQL queries in Mapbox Studio

Once these shapefiles are loaded into a database, we wrote SQL queries to bring them in a the correct zoom and filter then down to fit within 500 MB per zoom level. Refer to the SQL queries in your data.yml file for the specific code. Here is an overview of the Mapnik and `postgis-vt-util` functions you need to know.


### Basic query

This example simply includes all geometries from a table at all zoom levels.

    ( SELECT * FROM table_name ) AS data

The parts inside the parentheses are the meat of what's going on. The parentheses and the AS data are just syntactic necessities.

### Using spatial indexes effectively

The SQL queries in a Mapbox Studio source project are run once for each tile you export, so making sure these queries run quickly is they key to efficient exports. One of the best ways to speed up a query is to make sure it's only looking at features that would actually be visible in the given tile using spatial indexes generated when you imported your data. By default, an attempt at this is made behind-the-scenes, but for more complex queries you'll need to ensure this manually.


    ( SELECT * FROM table_name
      WHERE wkb_geometry && !bbox!
    ) AS data


Assuming wkb_geometry is your geometry column, this query will only select features whose geometries have bounding boxes that intersect with the tile the query is being run for. Behind the scenes, !bbox! is replaced with a polygon representing the area covered by each tile.

### Limiting data by zoom level

If you have a layer that's not needed at every zoom level, you can craft your query to limit the selection based on the zoom level. This will require the z() function provided by the postgis-vt-utils package. This also makes for smaller, more efficient tiles and smaller vector tiles when you are uploading this data set to Mapbox.com. 


    ( SELECT * FROM table_name
      WHERE z(!scale_denominator!) >= 6
      AND wkb_geometry && !bbox!
    ) AS data


It's good practice to include the avoid spatially-irrelevant clause mentioned above after your `WHERE` clause. You just add an `AND` statement to tack on that filter as well.

### Controlling label density

Point data needs to controlled because in some locations you have hundreds of points geographically close to each other, or even on top of each other. These dense areas mean that certain vector tiles will be very heavy, but Mapbox Studio will render them just the same. Now imagine what happens when you zoom out to low zoom levels, again these dense areas become problematic when they are combined with a CartoCSS style + used to generate a raster tile. 

If you ever upload Mapbox Studio style to mapbox.com, and are met with an error like `Drawtime avg. exceeded limit of 300ms` or `Drawtime max exceeded limit of 1000ms` it's likely that the style is using vector tiles that are too dense, and thus requiring `Mapnik` to do too much work to generate .png tiles.

`labelgrid` lets you control the density of label points by dividing each tile into an imaginary grid and only allowing one label per grid cell. You can adjust the density by changing the dimensions of the grid.


    ( SELECT * FROM (
        SELECT DISTINCT ON(labelgrid(wkb_geometry, 64,!pixel_width!)) *
        FROM populated_places
        ORDER BY labelgrid(wkb_geometry, 64,!pixel_width!), population DESC NULLS LAST, id
      ) AS ordered
      ORDER BY population DESC NULLS LAST, id
    ) AS data

There are a number of things going on in this query.

- The `labelgrid` function itself only returns a unique string for each grid cell on the map - two geometries in the same cell will get the same result from this function. This string is used in the `DISTINCT ON` portion of the query to produce only one result per cell.
- The `ORDER BY` sections ensure that the correct geometries are being prioritized - in this case places with the highest populations.
- The `id` included in the order by is there to ensure consistent ordering every time the query is run. If two nearby places have the same population, PostgreSQL will not always return things in a consistent order unless you force it with a final column in the `ORDER BY` that has a unique value for every object.

### Multiple tables in one layer

Sometimes your source data may be broken up more than necessary, and you want to include multiple tables in one layer for easier styling. As long as you can make the columns for all the tables consistent, you can do this with `UNION ALL`.

We're also using the `z()` function and `!bbox!` token explained in previous examples.


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

