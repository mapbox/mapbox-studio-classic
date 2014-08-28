Changelog
=========

### 0.0.5

- Fixes for conflicting keybindings.
- Windows installer is now signed with the Mapbox cert.
- Windows installer now bundles Visual C++ (2013) runtimes.

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

