#!/usr/bin/env bash

PLATFORM=$(uname -s | sed "y/ABCDEFGHIJKLMNOPQRSTUVWXYZ/abcdefghijklmnopqrstuvwxyz/")
COMMIT_MESSAGE=$(git show -s --format=%B $1 | tr -d '\n')
GITSHA=$(echo "$COMMIT_MESSAGE" | grep -oE '\[publish [a-z0-9\.\-]+\]' | grep -oE '[a-z0-9\.\-]+' | tail -n1)

if [[ ${PACKAGABLE:-false} == true ]]; then

    if [ $PLATFORM == "linux" ] && [ -n "$GITSHA" ]; then
        set -eu

        echo "Publishing $GITSHA"
        sudo apt-get update
        sudo apt-get install -qqy curl unzip nsis python-pip mono-devel expect p7zip-full
        sudo pip install -q awscli
        sudo curl -Lsf https://github.com/mapbox/windowsign/archive/v0.0.1.tar.gz | \
        sudo tar --strip 1 -xzf - --directory=/usr/local/bin "windowsign-0.0.1/windowsign"
        ./scripts/build-atom.sh "$GITSHA" linux
        ./scripts/build-atom.sh "$GITSHA" win32 x64
        ./scripts/build-atom.sh "$GITSHA" win32 ia32
        aws s3 ls s3://mapbox/mapbox-studio/ > listing.txt
        ./scripts/generate-s3-listing.py < listing.txt > index.html
        aws s3 cp --acl=public-read index.html s3://mapbox/mapbox-studio/index.html
    elif [ $PLATFORM == "darwin" ] && [ -n "$GITSHA" ]; then
        echo "Publishing $GITSHA"
        brew install python
        brew link --overwrite python

        set -eu

        pip install -q awscli
        ./scripts/build-atom.sh "$GITSHA" darwin
    else
        echo "Not publishing for $PLATFORM / $GITSHA / node $NODE_VERSION / atom $ATOM_VERSION"
    fi
else
    echo "Not marked packagable: $PLATFORM / $GITSHA / node $NODE_VERSION / atom $ATOM_VERSION"
fi