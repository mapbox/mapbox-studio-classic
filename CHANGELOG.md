Changelog
=========

### Upcoming

- New `dot` symbolizer for faster rendering of points (better that `marker`).
- Improved performance of GeoJSON, TopoJSON, and GeoTIFF.
- Update to node-mapnik 3.2.1 from 3.1.2.
- Update to mapnik-omnivore 5.0.7.
- Fixed crashes when vector tiles are generated >= 64 MB.
- New CartoCSS styling properties for text: `text-transform:reverse;`, `text-upright:auto-down;`, and `marker-direction`.

### 0.2.7
- Source UI: Fixed bug where map would lock up after adding a new data source.
- Windows: Fix atom-shell bug that caused a hang when downloading exported mbtiles, export images.
- Add inline helper text for source mode UI on buffer, maxzoom and minzoom.
- Set minzoom and maxzoom slider max level to 16 in UI (from 22). Can be increased [manually by editing data.yml](https://www.mapbox.com/guides/source-manual/#source-project), however z16+ is not recommended or necessary due to [overzooming](https://www.mapbox.com/guides/source-manual/#overzooming).
- Add tracking to values saved buffer, maxzoom and minzoom in source usage.

### 0.2.6
- On launch, Mapbox Studio opens on a blank style project rather than the last used project.
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
- Windows: run Mapbox Studio as a 64-bit application.

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
- Windows: install now prompts to uninstall previous installations of Mapbox Studio.
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

