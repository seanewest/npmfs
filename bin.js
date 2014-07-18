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
 * Convert a node.js file system exception to a numerical errno value.
 * This is necessary because node's exc.errno property appears to have wrong
 * values based on experiments.
 * On the other hand, the exc.code string seems like a correct representation
 * of the error, so we use that instead.
 */

var errnoMap = {
    EPERM: 1,
    ENOENT: 2,
    EACCES: 13,    
    EINVAL: 22,
    ENOTEMPTY: 39
};

function excToErrno(exc) {
  var errno = errnoMap[exc.code];
  if (!errno)
    errno = errnoMap.EPERM; // default to EPERM
  return errno;
}




//---------------------------------------------------------------------------

/*
 * Handler for the getattr() system call.
 * path: the path to the file
 * cb: a callback of the form cb(err, stat), where err is the Posix return code
 *     and stat is the result in the form of a stat structure (when err === 0)
 */
function getattr(path, cb) {
  console.log('getattr path ' + path)
  //take off first slash
  var binpath = path.slice(1);
  //console.log('getattr ' + path)
  if (bins.indexOf(binpath) != -1) {
    console.log('virtualized ' + binpath)
    var stat = {};
    stat.size = 4096;
    stat.mode = 41453; // lrwxr-xr-x symlink
    return cb(0, stat);
  } else if (path === '/') {
    console.log('got directory')
    var stat = {};
    stat.size = 4096;   // standard size of a directory
    stat.mode = 040777; // directory with 777 permissions
    return cb(0, stat)
  } else {
    var ENOENT = 2; //no file or directory error
    return cb(-ENOENT)
  }


  var path = pth.join(srcRoot, path);
  return fs.lstat(path, function lstatCb(err, stats) {
    console.log('err is ' + err)
    if (err) { 
      var no = -excToErrno(err);
      console.log('errorno is ' + no);
      return cb(no);
    }
    return cb(0, stats);
  });
};

//---------------------------------------------------------------------------

/*
 * Handler for the readdir() system call.
 * path: the path to the file
 * cb: a callback of the form cb(err, names), where err is the Posix return code
 *     and names is the result in the form of an array of file names (when err === 0).
 */
function readdir(path, cb) {
  var path = pth.join(srcRoot, path);
  return fs.readdir(path, function readdirCb(err, files) {
    if (err)      
      return cb(-excToErrno(err));
    return cb(0, files);
  });
}

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
  console.log('@@@@@@@@@@@')
  console.log('prefix path is ' + prefix_path)
  console.log('@@@@@@@@@@@')
  //console.log('getattr ' + path)
  if (bins.indexOf(name) != -1) {
    console.log('virtualized link' + name)
    if (fs.existsSync(prefix_path)) {
      console.log('returning after preexisting')
      return cb(0, prefix_path)
    } else {
      npm.config.set('global', true);
      npm.commands.install([name], function() {
        console.log('returning after install')
        return cb(0, prefix_path);
      })
    }
  } else {
    console.log('returning after error')
    var ENOENT = 2; //no file or directory error
    return cb(-ENOENT)
  }


  /*var path = pth.join(srcRoot, path);
  return fs.readlink(path, function readlinkCb(err, name) {
    if (err)      
      return cb(-excToErrno(err));
    var name = pth.resolve(srcRoot, name);
    return cb(0, name);
  });*/
}

//---------------------------------------------------------------------------

/*
 * Handler for the chmod() system call.
 * path: the path to the file
 * mode: the desired permissions
 * cb: a callback of the form cb(err), where err is the Posix return code.
 */
function chmod(path, mode, cb) {
  var path = pth.join(srcRoot, path);
  return fs.chmod(path, mode, function chmodCb(err) {
    if (err)
      return cb(-excToErrno(err));
    return cb(0);
  });
}

//---------------------------------------------------------------------------

/*
 * Converts numerical open() flags to node.js fs.open() 'flags' string.
 */
function convertOpenFlags(openFlags) {
  switch (openFlags & 3) {
  case 0:                    
    return 'r';              // O_RDONLY
  case 1:
    return 'w';              // O_WRONLY
  case 2:
    return 'r+';             // O_RDWR
  }
}

//---------------------------------------------------------------------------

/*
 * Handler for the open() system call.
 * path: the path to the file
 * flags: requested access flags as documented in open(2)
 * cb: a callback of the form cb(err, [fh]), where err is the Posix return code
 *     and fh is an optional numerical file handle, which is passed to subsequent
 *     read(), write(), and release() calls (set to 0 if fh is unspecified)
 */
function open(path, flags, cb) {
  var path = pth.join(srcRoot, path);
  var flags = convertOpenFlags(flags);
  fs.open(path, flags, 0666, function openCb(err, fd) {
    if (err)      
      return cb(-excToErrno(err));
    cb(0, fd);    
  });
}

//---------------------------------------------------------------------------

/*
 * Handler for the read() system call.
 * path: the path to the file
 * offset: the file offset to read from
 * len: the number of bytes to read
 * buf: the Buffer to write the data to
 * fh:  the optional file handle originally returned by open(), or 0 if it wasn't
 * cb: a callback of the form cb(err), where err is the Posix return code.
 *     A positive value represents the number of bytes actually read.
 */
function read(path, offset, len, buf, fh, cb) {
  fs.read(fh, buf, 0, len, offset, function readCb(err, bytesRead, buffer) {
    if (err)      
      return cb(-excToErrno(err));
    cb(bytesRead);
  });
}

//---------------------------------------------------------------------------

/*
 * Handler for the write() system call.
 * path: the path to the file
 * offset: the file offset to write to
 * len: the number of bytes to write
 * buf: the Buffer to read data from
 * fh:  the optional file handle originally returned by open(), or 0 if it wasn't
 * cb: a callback of the form cb(err), where err is the Posix return code.
 *     A positive value represents the number of bytes actually written.
 */
function write(path, offset, len, buf, fh, cb) {
  fs.write(fh, buf, 0, len, offset, function writeCb(err, bytesWritten, buffer) {
    if (err)      
      return cb(-excToErrno(err));
    cb(bytesWritten);
  });
}

//---------------------------------------------------------------------------

/*
 * Handler for the release() system call.
 * path: the path to the file
 * fh:  the optional file handle originally returned by open(), or 0 if it wasn't
 * cb: a callback of the form cb(err), where err is the Posix return code.
 */
function release(path, fh, cb) {
  fs.close(fh, function closeCb(err) {
    if (err)      
      return cb(-excToErrno(err));
    cb(0);
  });
}

//---------------------------------------------------------------------------

/*
 * Handler for the create() system call.
 * path: the path of the new file
 * mode: the desired permissions of the new file
 * cb: a callback of the form cb(err, [fh]), where err is the Posix return code
 *     and fh is an optional numerical file handle, which is passed to subsequent
 *     read(), write(), and release() calls (it's set to 0 if fh is unspecified)
 */
function create (path, mode, cb) {
  var path = pth.join(srcRoot, path);
  fs.open(path, 'w', mode, function openCb(err, fd) {
    if (err)      
      return cb(-excToErrno(err));
    cb(0, fd);    
  });
}

//---------------------------------------------------------------------------

/*
 * Handler for the unlink() system call.
 * path: the path to the file
 * cb: a callback of the form cb(err), where err is the Posix return code.
 */
function unlink(path, cb) {
  var path = pth.join(srcRoot, path);
  fs.unlink(path, function unlinkCb(err) {
    if (err)      
      return cb(-excToErrno(err));
    cb(0);
  });
}

//---------------------------------------------------------------------------

/*
 * Handler for the rename() system call.
 * src: the path of the file or directory to rename
 * dst: the new path
 * cb: a callback of the form cb(err), where err is the Posix return code.
 */
function rename(src, dst, cb) {
  src = pth.join(srcRoot, src);
  dst = pth.join(srcRoot, dst);
  fs.rename(src, dst, function renameCb(err) {
    if (err)      
      return cb(-excToErrno(err));
    cb(0);
  });
}

//---------------------------------------------------------------------------

/*
 * Handler for the mkdir() system call.
 * path: the path of the new directory
 * mode: the desired permissions of the new directory
 * cb: a callback of the form cb(err), where err is the Posix return code.
 */
function mkdir(path, mode, cb) {
  var path = pth.join(srcRoot, path);
  fs.mkdir(path, mode, function mkdirCb(err) {
    if (err)      
      return cb(-excToErrno(err));
    cb(0);
  });
}

//---------------------------------------------------------------------------

/*
 * Handler for the rmdir() system call.
 * path: the path of the directory to remove
 * cb: a callback of the form cb(err), where err is the Posix return code.
 */
function rmdir(path, cb) {
  var path = pth.join(srcRoot, path);
  fs.rmdir(path, function rmdirCb(err) {
    if (err)      
      return cb(-excToErrno(err));
    cb(0);
  });

}

//---------------------------------------------------------------------------

/*
 * Handler for the init() FUSE hook. You can initialize your file system here.
 * cb: a callback to call when you're done initializing. It takes no arguments.
 */
var init = function (cb) {
  console.log("File system started at " + options.mountPoint);
  console.log("To stop it, type this in another shell: umount " + options.mountPoint);
  cb();
}

//---------------------------------------------------------------------------

/*
 * Handler for the destroy() FUSE hook. You can perform clean up tasks here.
 * cb: a callback to call when you're done. It takes no arguments.
 */
var destroy = function (cb) {
  console.log("File system stopped");      
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

function usage() {
  console.log();
  console.log("Usage: node mirrorFS.js [options] sourceMountPoint mountPoint");
  console.log("(Ensure the mount point is empty and you have wrx permissions to it)\n")
  console.log("Options:");
  console.log("-d                 : make FUSE print debug statements.");
  console.log();
}

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
      console.log('Shutting down...\n');
      closing = true;
      destroy(function() {
        proc.fork(pth.join(__dirname, 'destroy.js'), [options.mountPoint, ''+process.pid]);
      });
    });

    process.on('SIGTERM', function() {
      console.log('sigterm received')
      process.exit();
    });
  })
})();
