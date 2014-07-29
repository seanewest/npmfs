# npmfs
A filesystem that looks like it holds all the node_modules and executables of every npm package

## install

```
npm install -g seanewest/npmfs
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

You can have npmfs launch on startup by installing it as a service. Paths are located in /usr/local/npmfs/node_modules and /usr/local/npmfs/bin
```
npmfs install
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
npmfs uninstall
```
remove the added paths if needed
```
sudo rm /etc/paths.d/npmfs
```
