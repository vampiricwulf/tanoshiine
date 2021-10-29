#!/bin/bash

TANODIR=/home/webby/doushio
source ~/.nvm/nvm.sh
nvm use default
cd $TANODIR
/usr/bin/screen -d -m -S boards node builder.js
