#!/usr/bin/env bash
NDM=../node_modules/.bin/ndm
NDM generate > /dev/null
NDM start


#echo ''
#echo 'Running sudo sh -c "echo /usr/local/npmfs > /etc/paths.d/npmfs"'
#sudo sh -c "echo /usr/local/npmfs_bin > /etc/paths.d/npmfs_bin"