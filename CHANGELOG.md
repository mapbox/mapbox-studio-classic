Changelog
=========

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

