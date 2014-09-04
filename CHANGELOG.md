Changelog
=========

### 0.0.8

- Fix MBTiles handling for paths that contain spaces.

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

