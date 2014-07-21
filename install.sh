#!/usr/bin/env bash

sudo echo /usr/local/npmfs > /etc/paths.d/npmfs
ndm generate > /dev/null
ndm start npmfs-service
