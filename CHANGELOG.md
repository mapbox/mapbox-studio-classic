Changelog
=========

### 0.3.8

- Downgraded to Carto v0.15.x to full back compatibility in color parsing.

### 0.3.7

- Upgraded to Carto v0.16.2, fixing regression in CartoCSS color subtraction

### 0.3.6

- Upgraded to Carto v0.16.1, fixing regression in the CartoCSS `mix` function
- Upgraded to node-mapnik@3.5.13

### 0.3.5

- Zoom to layer extent now works for PostGIS and SQlite sources (#1515)
- Upgraded to Carto v0.16.0
- Upgraded to node-mapnik@3.5.10, now supporting the creation of vector tiles
  adhering to the v2 spec: https://github.com/mapbox/vector-tile-spec/tree/master/2.1

### 0.3.4

- Fixed support for KML and GPX formats
 - Known issue: GPX file with `<time>` element are broken but will work in the next release  
- Update tilelive-bridge to validate mapnik XML at source creation
- `.index` files for shapefiles [are no longer backwards compatible](https://github.com/mapbox/mapbox-studio-classic/issues/1523) and must be regenerated. New index files can be regenerated locally on OS X:
```
cd ~/Downloads/mapbox-studio-darwin-x64-v0.3.3
"Mapbox Studio.app/Contents/Resources/app/vendor/node" "Mapbox Studio.app/Contents/Resources/app/node_modules/mapnik/bin/mapnik-shapeindex.js" <path/to/shapefile.shp>
```
- Update node-mapnik (v3.4.18) to support backwards compatible vector tiles (v1/v2)
- Update node-gdal ([v0.8.0](https://github.com/naturalatlas/node-gdal/releases))
- Update tilelive-vector to include tm2z bug fixes, `transparent` background support for xray tiles, [etc](https://github.com/mapbox/tilelive-vector/blob/master/CHANGELOG.md)
- Update mapnik-omnivore with maxzoom adjustments for rasters, shapefile projection bug fix, and dep updates
- Update minor dependencies

### 0.3.3

- fixes a bug that prevented startup on fresh installation of Mapbox Studio Classic

### 0.3.2

- Updated to use node-mapnik 3.4.9
- Vector tile sizes reduced due to removing repeated points in polylines and multi-polylines
- Simplify distance reduced from 8 to 4 causing vector tiles that are created to be LESS simplified
- Fixed various bugs with CSVs
- Various Vector Tile creation speed improvements

### 0.3.1

- Updated to use node-mapnik 3.4.7
- `scale-hsla` filter now works for values greater then 1.0.
- Fixed bug in topojson uploads not working properly.
- Improved CSV support with better support for different line-endings.
- Improved CSV performance for large files.

### 0.3.0

- Changed the name of Mapbox Studio to Mapbox Studio Classic!
- Updated to node-mapnik 3.4.6
- Updated tilelive to 5.9.0
- Updated tilelive-bridge to 1.6.0
- Fixes a bug where some data might have gone missing during vector tile creation.

### 0.2.8

- Added reference docs to source mode, removed inline helper text from UI.
- Made UI lat/lng format consistent after searching in tool.
- Enabled export image / print option for local datasets.
- New `dot` symbolizer for faster rendering of points (better that `marker`).
- Improved performance of GeoJSON, TopoJSON, and GeoTIFF.
- Update to node-mapnik 3.4.6 from 3.1.2.
- Update to mapnik-omnivore 6.3.0.
- Fixed crashes when vector tiles are generated >= 64 MB.
- New CartoCSS styling properties for text: `text-transform:reverse;`, `text-upright:auto-down;`, and `marker-direction`.
- Added CartoCSS filters for colorblindness: `color-blind-protanope`,`color-blind-deuteranope`,`color-blind-tritanope`
- Improved performance for creating vector tiles.
- Vector tiles now are created with consistent winding orders no matter what source winding order exists.
- Offset in polygons now consistently extends outwards from the polygon, rather then possibly inwards.
- Offset on lines is now always positive to the right.
- Fixed issues with offsets in polygons not starting and ending at the same position.
- Partial proxy support: very first start has to be done without proxy. Next starts work through proxies via environment variables `HTTP_PROXY` and `HTTPS_PROXY`
- Windows installer supports silent option `/S`. Use like this `start /wait mapbox-studio-win32-x64-v0.2.8.exe /S` to check `%ERRORLEVEL%` for success.
- Added Windows atom shell logging again (removed in 0.2.5): `%USERPROFILE%\.mapbox-studio\shell.log`
- Characters `{[#]}` can be typed with non US keyboard layout
- Windows: no breakage when Visual Studio 2015 is installed

### 0.2.7
- Source UI: Fixed bug where map would lock up after adding a new data source.
- Windows: Fix atom-shell bug that caused a hang when downloading exported mbtiles, export images.
- Add inline helper text for source mode UI on buffer, maxzoom and minzoom.
- Set minzoom and maxzoom slider max level to 16 in UI (from 22). Can be increased [manually by editing data.yml](https://www.mapbox.com/guides/source-manual/#source-project), however z16+ is not recommended or necessary due to [overzooming](https://www.mapbox.com/guides/source-manual/#overzooming).
- Add tracking to values saved buffer, maxzoom and minzoom in source usage.

### 0.2.6
- On launch, Mapbox Studio Classic opens on a blank style project rather than the last used project.
- Fix rendering issues with when font list titles are focused.
- Validate interactivity layer and template.
- Don't show UTF grid tooltips in xray mode.
- Source UI: Fixed bug where file sources with spaces and diacritics in names wouldn't show up in the UI after load.
- Source UI: Tab key now creates soft tabs (2 spaces) instead of Tab character.
- Style UI: Fix bug with broken preview images for fonts with special characters in their names.
- Fix mbtiles export failure on Windows.
- Fix fullscreen mode persistence on OS X.

### 0.2.5
- Remove Windows atom shell logging as a stopgap fix.

### 0.2.4
- Upgrade to mapbox-upload 3.0.0
- Fix version display update UI

### 0.2.3
- Add shell.log and document log location.
- Add timestamps and stacktraces to logs.
- Style UI: Fix bugs around the Places UI.
- Fix bugs in atom-shell integration.
- Source UI: Add warnings if tiles are too large.

### 0.2.2

- Update to node-mapnik 3.1.2.

### 0.2.1

- Windows: Windows installer no longer supports customizing the installation path.
- Windows: Now providing both 32 and 64 bit Windows installers.
- Style UI: Disable Mapbox.com paths for Atlas integration.
- Update mapbox-upload to 2.0.0.
- Update tilejson to 0.12.x.
- Update Mapbox Outdoors to 2.0.0.
- Update mapnik-omnivore to 2.2.4.
- Add Retire to test for insecure dependencies.

### 0.2.0

- Package user-provided font files with styles.
- Removes support for reading fonts from the `.mapbox-studio/fonts` -- use style-specific fonts instead.
- Fixed Windows startup crash by packaging node.exe and native modules build consistently against Visual Studio 2014
- Style UI: Display fonts in a style's font directory.
- Style UI: fix bug where two spaces would be added after a successful carto autocompletion.
- Style UI: Clarify interface for saving new bookmarks
- Uninstaller on Windows now cleanly removes previous version before installing
- Restored support for OS X >= 10.8 (v0.1.6 only worked with >= 10.9)
- Update to node-mapnik 3.1.1 and related libraries.
- Update atom-shell to 0.19.2.
- Update node.js to 0.10.33

### 0.1.6

- Update to node-mapnik 3.0.5.
- Style UI: Fix bugs in places UI.
- Source UI: Clarify "create style" action.
- Windows: run Mapbox Studio Classic as a 64-bit application.

### 0.1.5

- Fix bugs in atom-shell integration.

### 0.1.4

- Update to tilelive@5.2.3 to fix some vector tile rendering artifacts.
- Source UI: fix bug with layers with dashes in IDs.
- Style/source UI: fix scrollbar overflow problems.
- Style UI: Image export indication in atom-shell.
- Fix bug in xray popup template that affected features with a 'length' property.
- Fix carto docs example for font-directory.
- Cache busting querystring added to js/css assets to avoid stale caches on updates.

### 0.1.3

- Fixed bug where source data not in WGS84 or web mercator would not export correctly.
- Save + refresh functionality of projects refactored and split to Cmd+S and Cmd+R respectively.
- Style UI: Improved code search.
- Style UI: Add color picker.
- Source UI: Improved flow of actions into refreshed state.
- Source editor: support for topojson files (via mapnik-omnivore@1.4.15)
- Windows: install now prompts to uninstall previous installations of Mapbox Studio Classic.
- Windows: install now uses a flatter directory structure for easier removal of long paths.

### 0.1.2

- Update to mapnik-omnivore@1.3.13. Addresses some app crashes.
- Windows: Sign atom.exe when bundling to prevent antivirus software from detecting false positives.
- Style/source UI: show project center, add toggle for saveCenter flag.

### 0.1.1

- Include full set of Komika fonts.
- Source UI: Fix bug where incorrect active panel would show when adding new source
- Updates and bugfixes for example styles.
- Update atom-shell to 0.16.2.

### 0.1.0

- Add several free fonts as part of upgrade to mapbox-studio-default-fonts@0.0.3.
- Add 8 additional example styles.
- Style UI: various design improvements.

### 0.0.9

- Style UI: tags displayed and clickable to filter places UI.
- Upgrade mapbox-upload to 1.1.1.
- Upgrade mapbox-studio-default-fonts to 0.0.2 (adds Komika fonts).
- Style UI: reduce spam of font UI from Call fonts.
- Add error handling for source upload bug where client and server were not in sync causing UI to hang at 100%.

### 0.0.8

- Fix MBTiles handling for paths that contain spaces.
- Style UI: improved carto/styling reference UI.

### 0.0.7

- Windows: fix for OAuth templating error.
- Upgrade to node-mapnik 1.4.15 with fixes for raster overzooming performance and potential artifacts when exporting vector tiles.
- Fix bug where source.invalidate() was called on every refresh clearing the cache too aggressively.
- Fix for cache singleton logic and better debug messages to help track down Windows issues.

### 0.0.6

- Fixes for conflicting keybindings.
- Windows installer is now signed with the Mapbox cert.
- Windows installer now bundles Visual C++ (2013) runtimes.
- Style UI: Display user modifications to layer list if present.
- Shell: fix for export/saveas dialog of jpeg images.

### 0.0.5

- Exported mbtiles/serialtiles uploads compress PBFs with gzip instead of deflate.
- Source UI: allow datasource filenames that include whitespace characters.
- Style UI: display helptext if share actions are disabled.

### 0.0.4

- Changes default config dir from ~/.tilemill/v2 to ~/.mapbox-studio.
- Simple update system that checks for new releases and alerts users.
- Uses safer-stringify in templates.
- Logs to an app.log file in config dir by default.
- Bookmarks are now saved to projects rather than localStorage.
- Addition of password field to postgis datasource config.

