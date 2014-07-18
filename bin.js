/*
 * 
 * mirrorFS.js
 * 
 * Copyright (c) 2012 VMware, Inc. All rights reserved.
 * 
 */

var f4js = require('fuse4js');
var npm = require("npm");
var umount = require('./umount');
var fs = require('fs');
var pth = require('path');
var mkdirp = require('mkdirp');
var srcRoot = '/';   // The root of the file system we are mirroring
var options = {};  // See parseArgs()
var bins = [];

//---------------------------------------------------------------------------

/*
 * Handler for the getattr() system call.
 * path: the path to the file
 * cb: a callback of the form cb(err, stat), where err is the Posix return code
 *     and stat is the result in the form of a stat structure (when err === 0)
 */
function getattr(path, cb) {
  //take off first slash
  var binpath = path.slice(1);
  if (bins.indexOf(binpath) != -1) {
    var stat = {};
    stat.size = 4096;
    stat.mode = 41453; // lrwxr-xr-x symlink
    return cb(0, stat);
  } else if (path === '/') {
    var stat = {};
    stat.size = 4096;   // standard size of a directory
    stat.mode = 040777; // directory with 777 permissions
    return cb(0, stat)
  } else {
    var ENOENT = 2; //no file or directory error
    return cb(-ENOENT)
  }
};

//---------------------------------------------------------------------------

/*
 * Handler for the readlink() system call.
 * path: the path to the file
 * cb: a callback of the form cb(err, name), where err is the Posix return code
 *     and name is symlink target (when err === 0).
 */
function readlink(path, cb) {
  //take off first slash
  var name = path.slice(1);
  var prefix_path = pth.resolve(npm.config.get('prefix'), 'bin', name);
  //console.log('getattr ' + path)
  if (bins.indexOf(name) != -1) {
    if (fs.existsSync(prefix_path)) {
      return cb(0, prefix_path)
    } else {
      npm.config.set('global', true);
      npm.commands.install([name], function() {
        return cb(0, prefix_path);
      })
    }
  } else {
    var ENOENT = 2; //no file or directory error
    return cb(-ENOENT)
  }
}

//---------------------------------------------------------------------------

/*
 * Handler for the init() FUSE hook. You can initialize your file system here.
 * cb: a callback to call when you're done initializing. It takes no arguments.
 */
var init = function (cb) {
  console.log("starting npmfs at " + options.mountPoint);
  cb();
}

//---------------------------------------------------------------------------

/*
 * Handler for the destroy() FUSE hook. You can perform clean up tasks here.
 * cb: a callback to call when you're done. It takes no arguments.
 */
var destroy = function (cb) {
  console.log("stopping npmfs");      
  cb();
}

//---------------------------------------------------------------------------

/*
 * Handler for the statfs() FUSE hook. 
 * cb: a callback of the form cb(err, stat), where err is the Posix return code
 *     and stat is the result in the form of a statvfs structure (when err === 0)
 */
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

//---------------------------------------------------------------------------

var handlers = {
  getattr: getattr,
  readlink: readlink,
  statfs: statfs,
  destroy: destroy,
  init: init
};

//---------------------------------------------------------------------------


function loadbins() {
  var file = __dirname + '/bins.json';
   
  fs.readFile(file, 'utf8', function (err, data) {
    if (err) {
      console.log('Error: ' + err);
      return;
    }
   
    bins = JSON.parse(data);
  });  
}

//---------------------------------------------------------------------------

(function main() {
  loadbins();
  npm.load(function (er, npm) {
    var prefix = npm.config.get('prefix');
    options.srcRoot = pth.join(prefix, 'bin');
    srcRoot = options.srcRoot;
    options.mountPoint = pth.join(prefix, 'npmfs');    
    options.debugFuse = false;
    mnt = options.mountPoint;
    umount(mnt, function() {
      mkdirp(mnt, function() {
        f4js.start(options.mountPoint, handlers, options.debugFuse);
      });
    });

    var proc = require('child_process');
    var closing = false;
    process.on('SIGINT', function() {
      if (closing) return;
      closing = true;
      proc.fork(pth.join(__dirname, 'destroy.js'), [options.mountPoint, ''+process.pid]);
    });

    process.on('SIGTERM', function() {
      process.exit();
    });
  })
})();
