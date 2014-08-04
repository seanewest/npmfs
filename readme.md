# npmfs
A filesystem that looks like it holds all the node_modules and executables of every npm package

## install
First you need to install FUSE. See [this link](https://github.com/bcle/fuse4js#requirements) for more info.

```
npm install -g npmfs
```

## temporarily mount npmfs

### node_modules

Mount a node_modules folder that (seems to) contain all packages in npm
```
npmfs ~/node_modules
```
Now when in your home directory (or any subdirectory) it will seem like every npm package is locally installed.
```
cd
node
> typeof(require('dog'))
'object'
> typeof(require('cat'))
'function'
```

### executables

Mount a bin folder that (seems to) contain all executables in npm
```
npmfs --bin ~/bin
```
Then in another shell
```
#add the bin folder to our path!
PATH=$PATH:~/bin
```
Now try to run an executable you don't have like ```blah``` or ```wow```. It will automatically install and run it!



## install service

You can have npmfs launch on startup by installing it with an experimental version of [ndm](https://github.com/seanewest/ndm/tree/global).
```
$ npm install -g seanewest/ndm#global
$ ndm interview -g npmfs
starting interview:
[?] npmfs node_modules directory: /usr/local/npmfs/node_modules
[?] npmfs bin directory: /usr/local/npmfs/bin
[?] overwrite service.json with new values? Yes
wrote /usr/local/lib/node_modules/npmfs/service.json back to disk.
$ ndm generate -g npmfs
$ ndm start -g npmfs
```
permanently add the bin folder to our path

```
#if on a mac
sudo sh -c "echo /usr/local/npmfs/bin > /etc/paths.d/npmfs" #mac only

#or on ubuntu (untested)
sudo sh -c "echo 'export PATH=$PATH:/usr/local/npmfs/bin' > /etc/profile.d/npmfs.sh"
sudo chmod a+x /etc/profile.d/npmfs.sh
```

symlink all node_modules
```
ln -s /usr/local/npmfs/node_modules ~/node_modules
```

## remove service
```
ndm remove -g npmfs
```
remove the added paths if needed
```
sudo rm /etc/paths.d/npmfs
```
