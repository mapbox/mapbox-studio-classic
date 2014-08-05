#!/usr/bin/env bash

platform=$BUILD_PLATFORM

if [ -z "$platform" ]; then
    platform=$(uname -s | sed "y/ABCDEFGHIJKLMNOPQRSTUVWXYZ/abcdefghijklmnopqrstuvwxyz/")
fi

set -e -u
set -o pipefail

cwd=$(pwd)
mkdir -p $(dirname $0)/../vendor
cd $(dirname $0)/../vendor

if [ $platform == "win32" ]; then
    if [ -f node.exe ]; then
        echo "vendor node.exe already exists"
        cd $cwd
        exit 0
    else
        echo "downloading http://nodejs.org/dist/v0.10.30/node.exe"
        curl -fso node.exe http://nodejs.org/dist/v0.10.30/node.exe
        chmod a+x node.exe
        cd $cwd
        exit 0
    fi
else
    if [ -f node ]; then
        echo "vendor node already exists"
        cd $cwd
        exit 0
    else
        echo "downloading http://nodejs.org/dist/v0.10.30/node-v0.10.30-${platform}-x64.tar.gz"
        curl -fs "http://nodejs.org/dist/v0.10.30/node-v0.10.30-${platform}-x64.tar.gz" | tar zxvf - --strip=2 "node-v0.10.30-${platform}-x64/bin/node"
        cd $cwd
        exit 0
    fi
fi

