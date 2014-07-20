/*
 * 
 * Copyright (c) 2012 VMware, Inc. All rights reserved.
 * 
 */

var f4js = require('fuse4js');
var npm = require("npm");
var umount = require('./lib/umount');
var bins = require('./data/bins.json');
var fs = require('fs');
var pth = require('path');
var mkdirp = require('mkdirp');
var proc = require('child_process');
var options = {}; 
var prefix = '/usr/local';//npm.config.get('prefix');


(function main() {
    prefix = '/usr/local';
    options.mountPoint = pth.join(prefix, 'npmfs');    
    options.debugFuse = false;
    mnt = options.mountPoint;
    umount(mnt, function() {
      mkdirp(mnt, function() {
        console.log("starting npmfs at " + options.mountPoint);
        f4js.start(options.mountPoint, handlers(), options.debugFuse);
      });
    });

  var proc = require('child_process');
  var closing = false;
  process.on('SIGINT', function() {
    if (closing) return;
    console.log("stopping npmfs"); 
    closing = true;
    proc.fork(pth.join(__dirname, './lib/destroy.js'), [options.mountPoint, ''+process.pid]);
  });

  process.on('SIGTERM', function() {
    process.exit();
  });
})();

function handlers() {
 return {
    getattr: getattr,
    readlink: readlink,
    statfs: statfs
  };
}

function getattr(path, cb) {
  //take off first slash
  var name = path.slice(1);
  if (path === '/') {
    var stat = {};
    stat.size = 4096;   // standard size of a directory
    stat.mode = 040777; // directory with 777 permissions
    return cb(0, stat);
  } else if (bins.indexOf(name) != -1) {
    var stat = {};
    stat.size = 4096; // seems big enough for a symlink
    stat.mode = 41453; // lrwxr-xr-x symlink
    return cb(0, stat);
  } else {
    var ENOENT = 2; //no file or directory error
    return cb(-ENOENT)
  }
};

function readlink(path, cb) {
  //take off first slash
  var name = path.slice(1);
  var prefix_path = pth.resolve(prefix, 'bin', name);
  if (bins.indexOf(name) != -1) {
    //see whether it is already installed
    if (fs.existsSync(prefix_path)) {
      //grab its real location here
      return cb(0, prefix_path)
    } else {
      console.log('installing ' + name)

      var child = proc.fork(pth.join(__dirname, 'npm-install.js'), [name]);
      child.on('message', function(m) {
        //could ask for the real path of it here
        cb(0, prefix_path);
      });
    }
  } else {
    var ENOENT = 2; //no file or directory error
    return cb(-ENOENT)
  }
}

function statfs(cb) {
  cb(0, {
    bsize: 1000000,
    frsize: 1000000,
    blocks: 1000000,
    bfree: 1000000,
    bavail: 1000000,
    files: 1000000,
    ffree: 1000000,
    favail: 1000000,
    fsid: 1000000,
    flag: 1000000,
    namemax: 1000000
  });
}
