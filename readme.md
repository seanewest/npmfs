# npmfs
A filesystem that looks like it holds all the node_modules and executables of every npm package

Currently only the executables part of the filesystem is working

# install

```
$ npm install -g seanewest/npmfs
```

# usage

## Try it out

To just try it out:
```
$ npmfs
starting npmfs at /usr/local/npmfs
```

## Install as a service

Install as a service that launches on startup:
```
$ npm run-script -g npmfs add-service
```

Remove service:
```
$ npm run-script -g npmfs remove-service
```
