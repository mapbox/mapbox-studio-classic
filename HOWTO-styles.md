TM2 Vector Tile Styles
----------------------

_WIP, lots of missing info here_

A valid TM2 project is a folder that contains at minimum a valid `project.yml` file and at least one CartoCSS `.mss` file that is referenced by the YML file. The folder should also contain any images that are directly referenced by the style as patterns, icons, etc.

If you have any source files (Photoshop/Gimp/Illustrator/Inkscape documents, mockups, reference files, etc) that are not directly required to render the style, they should be named beginning with an underscore or kept in a subdirectory beginning with an underscore. TM2 will ignore such files & folders when creating packages to deploy for rendering.

### Generating a style package

Click the __Package__ link from the settings pane of a project.

TM2 styles are packaged into 'tm2z' files for deployment to a rendering server. The package *only* contains:

- `project.xml` - the Mapnik-ready XML style definition automatically built by TM2 from the project's CartoCSS files and project.yml
- `png`, `jpg`, and `svg` files unless they begin with an `_`

All other files are omitted from packaging.
