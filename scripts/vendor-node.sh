#!/usr/bin/env bash

platform=$BUILD_PLATFORM

if [ -z "$platform" ]; then
    platform=$(uname -s | sed "y/ABCDEFGHIJKLMNOPQRSTUVWXYZ/abcdefghijklmnopqrstuvwxyz/")
fi

if [ "$platform" == "win32" ]; then
    export INSTALL_NODE_URL=https://mapbox.s3.amazonaws.com/node-cpp11
fi

set -e -u
set -o pipefail

cwd=$(pwd)
mkdir -p $(dirname $0)/../vendor
cd $(dirname $0)/../vendor
curl https://s3.amazonaws.com/mapbox/apps/install-node/v0.2.0/run |  NV=$NODE_VERSION NP=$platform-x64 OD=$(pwd) BO=true sh

cd $cwd

