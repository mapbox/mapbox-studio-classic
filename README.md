### **[Mapbox Studio](https://www.mapbox.com/mapbox-studio/) is the modern alternative to Mapbox Studio Classic**: if you're starting out and creating a map today, we recommend starting with [Mapbox Studio](https://www.mapbox.com/mapbox-studio/) rather than Mapbox Studio Classic.

Desktop application for vector tile driven map design.

[![Build Status](https://secure.travis-ci.org/mapbox/mapbox-studio-classic.svg)](http://travis-ci.org/mapbox/mapbox-studio-classic)
[![Build status](https://ci.appveyor.com/api/projects/status/vmvkol2diegfo7gc?svg=true)](https://ci.appveyor.com/project/Mapbox/mapbox-studio-classic)
[![Dependencies](https://david-dm.org/mapbox/mapbox-studio-classic.svg)](https://david-dm.org/mapbox/mapbox-studio-classic)

### Install latest release

Download the [latest release](https://www.mapbox.com/mapbox-studio-classic/) for your platform and run the packaged app.

### Install from source

Install [node v0.10.x](http://nodejs.org/download/). Then

    git clone https://github.com/mapbox/mapbox-studio-classic.git
    cd mapbox-studio-classic
    npm install
    npm start

### Depends

Mapbox Studio Classic ships with pre-built binaries for common platforms:

  - 32 and 64 bit Windows
  - 64 bit OS X
  - 64 bit Linux

The minimum platforms versions are:

  - Windows >= 7
  - OS X >= 10.8
  - Ubuntu >= 14.04 (Trusty)
  - RHEL/Centos >= 7

Ubuntu 12.04 (Precise) can be supported by upgrading libstdc++:

    sudo add-apt-repository -y ppa:ubuntu-toolchain-r/test
    sudo apt-get update -q
    sudo apt-get install -y libstdc++6

If packages like `node-mapnik` fail to install then you are likely running a platform for which no binaries are available. In this case you will need to build these packages from source (Feel free to create a github issue to ask for help).

You can do this like:


    npm install --build-from-source

### Getting started

The docs offer both a step-by-step guide to creating your first projects in Mapbox Studio Classic and detailed information about styling and creating vector sources.

- [Style quickstart](https://www.mapbox.com/guides/style-quickstart/)
- [Source quickstart](https://www.mapbox.com/guides/source-quickstart/)
- [Common questions](https://www.mapbox.com/guides/common-questions/)
- [Contributing to Mapbox Studio Classic](https://github.com/mapbox/mapbox-studio-classic/blob/mb-pages/CONTRIBUTING.md)

------

Build status of modules:

 - mapnik - [![Build Status](https://secure.travis-ci.org/mapnik/mapnik.png)](http://travis-ci.org/mapnik/mapnik)
 - node-mapnik - [![Build Status](https://secure.travis-ci.org/mapnik/node-mapnik.png)](http://travis-ci.org/mapnik/node-mapnik)
 - carto - [![Build Status](https://secure.travis-ci.org/mapbox/carto.png)](http://travis-ci.org/mapbox/carto)
 - tilelive - [![Build Status](https://secure.travis-ci.org/mapbox/tilelive.png)](http://travis-ci.org/mapbox/tilelive)
 - tilelive-vector - [![Build Status](https://secure.travis-ci.org/mapbox/tilelive-vector.png)](http://travis-ci.org/mapbox/tilelive-vector)
 - tilelive-bridge - [![Build Status](https://secure.travis-ci.org/mapbox/tilelive-bridge.png)](http://travis-ci.org/mapbox/tilelive-bridge)
