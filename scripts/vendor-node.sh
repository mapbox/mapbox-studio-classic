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
curl https://s3.amazonaws.com/mapbox/apps/install-node/v0.1.4/run | NV=0.10.30 NP=$platform OD=$(pwd) BO=true sh
cd $cwd

