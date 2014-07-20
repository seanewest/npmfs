var npm = require('npm');

var prefix = '/usr/local';

npm.load({global: true, prefix: prefix}, function (er, npm) {
  npm.commands.install([process.argv[2]], function() {
    if (process.send)
      process.send('dummy message');
  });
});
