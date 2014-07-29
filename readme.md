# npmfs
A filesystem that looks like it holds all the node_modules and executables of every npm package

## install

```
npm install -g seanewest/npmfs
```

## temporarily mount npmfs

Mount a node_modules folder that (seems to) contain all packages in npm
```
npmfs ~/node_modules
```
Now when in any subdirectory of your home path all node modules in existance will be able to be required and used (almost) immediately


Mount a bin folder that (seems to) contain all executables in npm
```
npmfs --bin ~/bin
```
Then in another shell
```
#add the bin folder to our path!
PATH=$PATH:~/bin
```
Now try to execute a command you don't have ... like ```blah``` or ```wow``` ... it will automatically install and run it!



## install as a service (not implemented)

You can have npmfs launch on startup by installing it as a service. Paths are located in /usr/local/npmfs_modules and /usr/local/npmfs_bin
```
npmfs install
```
permanently add the bin folder to our path
```
sudo sh -c "echo /usr/local/npmfs_bin > /etc/paths.d/npmfs_bin"
```
symlink all node_modules
```
ln -s /usr/local/npmfs_modules ~/node_modules
```

## remove service (not implemented)
```
npmfs uninstall
```
do any cleanup needed
```
sudo rm /etc/paths.d/npmfs_bin
```
