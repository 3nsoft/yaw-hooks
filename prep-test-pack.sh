#!/bin/bash

echo "	-----------------------"
echo "	|   Prepare modules   |"
echo "	-----------------------"

npm ci || exit 1

echo "	-----------------"
echo "	|   Run tests   |"
echo "	-----------------"

npm run test || exit 1

echo "	-----------------------"
echo "	| Get node & pack deb |"
echo "	-----------------------"

NODE_VERSION="v12.13.0"

rm -rf build/tests
npm prune --production
mkdir webhook-app
mv node_modules build webhook-app/
cp package-lock.json package.json webhook-app/
curl --silent https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.xz --output node-${NODE_VERSION}-linux-x64.tar.xz
tar -xf node-${NODE_VERSION}-linux-x64.tar.xz
mv node-${NODE_VERSION}-linux-x64 node

chmod u+x packing/*.sh packing/deb/*.sh
source packing/deb/create-bin.sh
