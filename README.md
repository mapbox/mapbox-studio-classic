Mapbox Studio
-------------
Desktop application for vector tile driven map design.

[![Build Status](https://secure.travis-ci.org/mapbox/mapbox-studio.png)](http://travis-ci.org/mapbox/mapbox-studio)
[![Build status](https://ci.appveyor.com/api/projects/status/28kreaivb6nv6ju2)](https://ci.appveyor.com/project/Mapbox/mapbox-studio)
[![Dependencies](https://david-dm.org/mapbox/mapbox-studio.png)](https://david-dm.org/mapbox/mapbox-studio)

### Install latest release

Download the [latest release](https://www.mapbox.com/mapbox-studio/) for your platform and run the packaged app.

### Install from source

Install [node v0.10.x](http://nodejs.org/download/). Then

    git clone https://github.com/mapbox/mapbox-studio.git
    cd mapbox-studio
    npm install
    npm start

*Note: the binary dependencies of Mapbox Studio are now prebuilt for common platforms (64 bit Linux and OS X). This means that you do not need to install these dependencies externally. However if packages fail to install from a binary then you are likely running a platform for which no binaries are available. In this case you will need to build these packages from source.*

### Getting started

The docs offer both a step-by-step guide to creating your first projects in Mapbox Studio and detailed information about styling and creating vector sources.

- [Style quickstart](https://www.mapbox.com/mapbox-studio/style-quickstart/)
- [Source quickstart](https://www.mapbox.com/mapbox-studio/source-quickstart/)
- [Common questions](https://www.mapbox.com/mapbox-studio/common-questions/)
- [Contributing to Mapbox Studio](https://github.com/mapbox/mapbox-studio/blob/mb-pages/CONTRIBUTING.md)

------

Build status of modules:

 - mapnik - [![Build Status](https://secure.travis-ci.org/mapnik/mapnik.png?branch=2.3.x)](http://travis-ci.org/mapnik/mapnik)
 - node-mapnik - [![Build Status](https://secure.travis-ci.org/mapnik/node-mapnik.png)](http://travis-ci.org/mapnik/node-mapnik)
 - carto - [![Build Status](https://secure.travis-ci.org/mapbox/carto.png)](http://travis-ci.org/mapbox/carto)
 - tilelive.js - [![Build Status](https://secure.travis-ci.org/mapbox/tilelive.js.png)](http://travis-ci.org/mapbox/tilelive.js)
 - tilelive-vector - [![Build Status](https://secure.travis-ci.org/mapbox/tilelive-vector.png)](http://travis-ci.org/mapbox/tilelive-vector)
 - tilelive-bridge - [![Build Status](https://secure.travis-ci.org/mapbox/tilelive-bridge.png)](http://travis-ci.org/mapbox/tilelive-bridge)

