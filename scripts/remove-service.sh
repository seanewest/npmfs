#!/usr/bin/env bash
NDM=../node_modules/.bin/ndm
NDM stop
NDM remove


echo ''
echo 'Running sudo sh -c "rm -f /etc/paths.d/npmfs"'
sudo sh -c "rm -f /etc/paths.d/npmfs"
