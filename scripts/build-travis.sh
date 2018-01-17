#!/usr/bin/env bash

PLATFORM=$(uname -s | sed "y/ABCDEFGHIJKLMNOPQRSTUVWXYZ/abcdefghijklmnopqrstuvwxyz/")
COMMIT_MESSAGE=$(git show -s --format=%B $1 | tr -d '\n')
GITSHA=$(echo "$COMMIT_MESSAGE" | grep -oE '\[publish [a-z0-9\.\-]+\]' | grep -oE '[a-z0-9\.\-]+' | tail -n1)

if [[ ${PACKAGABLE:-false} == true ]]; then

    if [ $PLATFORM == "linux" ] && [ -n "$GITSHA" ]; then
        set -eu

        echo "Publishing $GITSHA"
        sudo apt-get update
        sudo apt-get install -qqy curl unzip python-pip mono-devel expect p7zip-full
        mkdir ./mason
        curl -sSfL https://github.com/mapbox/mason/archive/v0.17.0.tar.gz | tar --gunzip --extract --strip-components=1 --exclude="*md" --exclude="test*" --directory=./mason
        NSIS_VERSION="3.01"
        ./mason/mason install nsis ${NSIS_VERSION}
        export PATH=$(./mason/mason prefix nsis ${NSIS_VERSION})/bin:${PATH}
        export NSISDIR=$(./mason/mason prefix nsis ${NSIS_VERSION})
        makensis || true
        makensis --version || true
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
        set -eu

        curl -O https://bootstrap.pypa.io/get-pip.py
        sudo python get-pip.py
        pip install awscli --user
        export PATH=$(python -m site --user-base)/bin:${PATH}

        ./scripts/build-atom.sh "$GITSHA" darwin
    else
        echo "Not publishing for $PLATFORM / $GITSHA / node $NODE_VERSION / atom $ATOM_VERSION"
    fi
else
    echo "Not marked packagable: $PLATFORM / $GITSHA / node $NODE_VERSION / atom $ATOM_VERSION"
fi