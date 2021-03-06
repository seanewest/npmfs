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

First install [ndm](https://github.com/npm/ndm) if you don't already have it.
```
$ npm install -g ndm
```

Now install npmfs as a service:
```
$ ndm install npmfs
[?] npmfs node_modules directory: /usr/local/npmfs/node_modules
[?] npmfs bin directory: /usr/local/npmfs/bin
...
$ ndm start npmfs
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
ndm remove npmfs
```
remove the added paths if they were created
```
#if on a mac
sudo rm /etc/paths.d/npmfs

#or on ubuntu (untested)
sudo rm /etc/profile.d/npmfs.sh
```
