#!/usr/bin/env bash

platform=$1

if [ -z "$1" ]; then
    platform=$(uname -s | sed "y/ABCDEFGHIJKLMNOPQRSTUVWXYZ/abcdefghijklmnopqrstuvwxyz/")
else
    platform=$1
fi

set -e -u
set -o pipefail

cwd=$(pwd)
cd $(dirname $0)/../vendor

if [ $platform == "win32" ]; then
    if [ -f node.exe ]; then
        echo "vendor node.exe already exists"
        cd $cwd
        exit 0
    else
        curl -so node.exe http://nodejs.org/dist/v0.10.30/node.exe
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
        curl -s http://nodejs.org/dist/v0.10.30/node-v0.10.30-$platform-x64.tar.gz | tar zxvf - node-v0.10.30-$platform-x64/bin/node --strip=2
        cd $cwd
        exit 0
    fi
fi

