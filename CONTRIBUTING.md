For developers
--------------
Notes for developers.

### Packaging

Travis bundles Mapbox Studio with the [atom-shell](https://github.com/atom/atom-shell) wrapper and uploads packages to S3 for hosting. There are two OSs in the travis matrix:

- linux: builds linux, win32 platforms
- osx: builds darwin (because of osx-only code signing tools)

To package:

1. **Push a commit with `[publish GITSHA]` as the message.** `GITSHA` should be a commit hash, branch name, or tag that can be used with `git checkout`. *Note: the packaging process itself will use the code in the repo as of GITSHA -- in other words, your GITSHA must be able to package itself.*
2. **Check travis logs for success.** When complete downloads will be available at:

        https://mapbox.s3.amazonaws.com/mapbox-studio/mapbox-studio-linux-x64-{GITSHA}.zip
        https://mapbox.s3.amazonaws.com/mapbox-studio/mapbox-studio-darwin-x64-{GITSHA}.zip
        https://mapbox.s3.amazonaws.com/mapbox-studio/mapbox-studio-win32-ia32-{GITSHA}.exe
