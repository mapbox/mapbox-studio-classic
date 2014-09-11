Advanced features
=================

- [UTFGrid interactivity](#utfgrid-interactivity)
- [Custom layer order](#custom-layer-order)

UTFGrid interactivity
---------------------

[UTFGrid interactivity](https://github.com/mapbox/utfgrid-spec) can be added to style projects by manually editing the `project.yml` file and filling out these additional fields:

- **interactivity_layer:** the ID of the layer that should be made interactive.
- **template:** a UTFGrid [html/mustache template](https://github.com/mapbox/utfgrid-spec/blob/master/1.3/interaction.md#template) used to display data on tooltips.

![utfgrid example](https://cloud.githubusercontent.com/assets/83384/4242429/a11cce4c-39fd-11e4-8860-e8c9ad869762.png)

Example values for adding UTFGrid interactivity to [OSM Bright 2](https://github.com/mapbox/mapbox-studio-osm-bright.tm2):

    interactivity_layer: poi_label
    template: |
      <div style='text-align:center; font-size:12px;'>
        <strong>{{name}}</strong><br/>
        <em style='font-size:10px; text-case:capitalize;'>{{maki}}</em>
      </div>

_Note: After making edits to the `project.yml` file in a text editor you should quit and restart Mapbox Studio to see your changes. Studio loads up your project into memory and currently does not detect changes from other text editors._

Custom layer order
------------------

The layer order of a remote vector tile source can be altered. Manually edit the `project.yml` file of a style project and add a **layers** key with a YAML array of layers in the format `{id}.{class}`. The same layer can be listed multiple times provided a different class is included with each instance:

    source: "mapbox:///mapbox.mapbox-terrain-v1,mapbox.mapbox-streets-v5"
    layers:
      - landcover
      - landuse
      - contour.line
      - hillshade
      - contour.label

Once the **layers** key is added to a style project the source can only be changed by editing the `project.yml` file manually.

![Locked](https://cloud.githubusercontent.com/assets/83384/4242524/a059b1ea-39fe-11e4-9aad-8cf8d371e6a7.png)

_This source is locked in the UI because of a custom layer order defined in `project.yml`_

_Note: After making edits to the `project.yml` file in a text editor you should quit and restart Mapbox Studio to see your changes. Studio loads up your project into memory and currently does not detect changes from other text editors._
