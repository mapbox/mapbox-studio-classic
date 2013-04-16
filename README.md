TM2
---
Sketching out what a vector tile-based TileMill might look like.

### Mac OS X

Make sure you have node and libprotobuf installed. You can do this with homebrew

    brew install node protobuf

Then install the Mapnik OS X SDK via [these instructions](https://gist.github.com/springmeyer/f2f85aad63f1597ddd5b).

Finally install and run TileMill 2:

    git clone git@github.com:mapbox/tm2.git
    cd tm2
    npm install
    node index.js

### Ubuntu Linux

    sudo add-apt-repository -y ppa:mapnik/nightly-trunk
    sudo apt-get update
    sudo apt-get install protobuf-compiler libprotobuf-dev libmapnik libmapnik-dev mapnik-utils

    git clone git@github.com:mapbox/tm2.git
    cd tm2
    npm install
    node index.js

