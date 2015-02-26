var child_process = require('child_process');

var server = child_process.spawn('node', ['server/server.js']);
server.stdout.pipe(process.stdout);
server.stderr.pipe(process.stderr);
server.on('exit', function (code, signal) {process.exit(1);})
server.stdout.on('data', function (data) {
  if (/PID \d+ written in .*\.pid/.test(data))
    process.exit();
});
