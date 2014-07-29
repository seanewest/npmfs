#!/usr/bin/env node

var f4js = require('fuse4js');
var npm = require("npm");
var umount = require('./lib/umount');
var fs = require('fs');
var pth = require('path');
var mkdirp = require('mkdirp');
var proc = require('child_process');
var options = {}; 
var prefix = '/usr/local';
var names; //either all packages or all package executables

parseArgs();
if (options.runnable) {
  main();
}

function parseArgs() {
  var args = process.argv.slice(2);
  if (args[0] === 'install') {
    proc.exec('ndm generate > /dev/null; ndm start', 
      {"cwd": __dirname}, 
      function (error, stdout, stderr) {
        process.stdout.write(stdout);
      });
  }
  else if (args[0] === 'uninstall') {
    proc.exec('ndm remove', {"cwd": __dirname}, 
      function (error, stdout, stderr) {
        process.stdout.write(stdout);
      });
  }
  else if (args[0] === '--bin') {
    names = require('./data/bins.json');
    options.srcRoot = pth.join(prefix, 'bin');
    options.mountPoint = args[1];
    options.runnable = true;
  }
  else {
    names = require('./data/names.json');
    options.srcRoot = pth.join(prefix, 'lib', 'node_modules');  
    options.mountPoint = args[0];
    options.runnable = true;
  }

  options.debugFuse = false;
}

function main() {
  mnt = options.mountPoint;
  umount(mnt, function() {
    mkdirp(mnt, function() {
      console.log("starting npmfs at " + options.mountPoint);
      console.log("Hit Ctrl-C to stop process");
      f4js.start(options.mountPoint, handlers(), options.debugFuse);
    });
  });

  var closing = false;
  function shutdown() {   
    if (closing) return;
    console.log("stopping npmfs"); 
    closing = true;
    proc.fork(pth.join(__dirname, './lib/destroy.js'), [options.mountPoint, ''+process.pid]);
  }
  
  process.on('SIGINT', shutdown);

  process.on('SIGTERM', function() {
    if (!closing) {
      shutdown()
    } else {
      process.exit();
    }
  });
}

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
  } else if (names.indexOf(name) != -1) {
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
  var src = pth.resolve(options.srcRoot, name);
  if (names.indexOf(name) != -1) {
    if (fs.existsSync(src)) {
      return cb(0, src)
    } else {
      console.log('installing ' + name)

      var child = proc.fork(pth.join(__dirname, 'lib/npm-install.js'), [name]);
      child.on('message', function(m) {
        cb(0, src);
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
