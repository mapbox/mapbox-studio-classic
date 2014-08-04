#!/usr/bin/env bash

set -e -u
set -o pipefail

PLATFORM=$(uname -s | sed "y/ABCDEFGHIJKLMNOPQRSTUVWXYZ/abcdefghijklmnopqrstuvwxyz/")
COMMIT_MESSAGE=$(git show -s --format=%B $1 | tr -d '\n')
GITSHA=$(echo "$COMMIT_MESSAGE" | grep -oE '\[publish [a-z0-9\.\-]+\]' | grep -oE '[a-z0-9\.\-]+' | tail -n1)

if [ $PLATFORM == "linux" ] && [ -n "$GITSHA" ]; then
    echo "Publishing $GITSHA"
    sudo apt-get install -qqy curl unzip nsis python-pip
    sudo pip install -q awscli
    ./scripts/build-atom.sh "$GITSHA" linux
    ./scripts/build-atom.sh "$GITSHA" win32
elif [ $PLATFORM == "darwin" ] && [ -n "$GITSHA" ]; then
    echo "Publishing $GITSHA"
    sudo brew install python
    sudo pip install -q awscli
    ./scripts/build-atom.sh "$GITSHA" darwin
fi
