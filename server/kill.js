#!/usr/bin/env node
var config = require('../config'),
    opts = require('./opts'),
    path = require('path');

opts.parse_args();
opts.load_defaults();
var lock = config.PID_FILE;

var cfg = config.DAEMON;
if (cfg) {
	require('daemon').kill(lock, function (err) {
		if (err)
			throw err;
	});
}
else {
	/* non-daemon version for hot reloads */
	require('fs').readFile(lock, function (err, pid) {
		pid = parseInt(pid, 10);
		if (err || !pid)
			return console.warn('No pid.');
		require('child_process').exec('kill -HUP ' + pid,
					function (err) {
			if (err) throw err;
			if (process.argv.indexOf('--silent') < 2)
				console.log('Sent HUP.');
		});
	});
}
