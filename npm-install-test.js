var proc = require('child_process');
var pth = require('path');

var child = proc.fork(pth.join(__dirname, 'npm-install.js'), ['jq']);
child.on('message', function(m) {
  console.log('holy shit I got back')
});
