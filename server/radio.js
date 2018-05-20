/* Polls an icecast2 server for now-playing info, and broadcasts it.
 * Configure here, and install poll.xsl into icecast http root.
 */

var _ = require('underscore'),
    caps = require('./caps'),
    common = require('../common'),
    okyaku = require('./okyaku'),
    expat = require('node-expat'),
    request = require('request'),
    winston = require('winston');

var RADIO_IDENT = {auth: 'Radio', ip: '127.0.0.1'};
var RADIO_MOUNT = '/testasfuck';
var ICECAST_POLL_URL = 'http://localhost:8000/poll.xsl';
var M3U_URL = 'http://radio.tanoshiine.info/testasfuck.m3u';
var SHORT_INTERVAL = 3 * 1000;
var LONG_INTERVAL = 30 * 1000;
var cachedSong = "";

exports.getSong = function () {
	return cachedSong;
}

function update_banner(info, cb) {
	cachedSong = info.msg;
	winston.info(info.msg);
	okyaku.push([0, common.UPDATE_BANNER, info.msg]);
	cb();
}

function make_monitor(poll) {
function monitor(last) {
	poll(function (err, info) {
		if (err)
			winston.error(err); // fall through
		var clear = false;
		var interval = SHORT_INTERVAL;
		if (!info && last) {
			clear = true;
			info = last;
			info.msg = '';
			interval = LONG_INTERVAL;
		}
		var sameAsLast = _.isEqual(info, last);
		if (!clear && (!info || sameAsLast)) {
			if (!info)
				interval = LONG_INTERVAL;
			setTimeout(monitor.bind(null, last), interval);
		}
		else {
			update_banner(info, function () {
				if (err) {
					winston.error(err);
					interval = LONG_INTERVAL;
				}
				if (clear)
					info = null;
				setTimeout(monitor.bind(null, info), interval);
			});
		}
	});
}
	return monitor;
}

function poll_icecast(cb) {
	request.get(ICECAST_POLL_URL, function (err, resp, body) {
		if (err)
			return cb(err);
		if (resp.statusCode != 200)
			return cb("Got " + resp.statusCode);
		parse_icecast(body, function (err, mounts) {
			if (err)
				cb(err);
			else
				cb(null, format_icecast(mounts));
		});
	});
}

function format_icecast(mounts) {
	var radio = mounts[RADIO_MOUNT];
	if (!radio)
		return null;
	var count = parseInt(radio.listeners, 10);
	count = count + ' listener' + (count == 1 ? '' : 's');
	var msg = [{extra: radio, text: count, href: M3U_URL}];
	if (radio.title) {
		radio.artist = radio.artist ? radio.artist : 'Unknown Artist';
		msg.push(': ' + radio.artist + ' - ' + radio.title);
	} else if (radio.genre) {
		msg.push(': ' + radio.genre);
	}
	return {msg: msg};
}

function parse_icecast(input, cb) {
	var mounts = {}, curMount, thisKey, thisVal;
	var parser = new expat.Parser('UTF-8');
	parser.on('startElement', function (name, data) {
		if (name == 'mount') {
			curMount = {};
			return;
		}
		if (curMount) {
			thisKey = name;
			thisVal = [];
		}
	});
	parser.on('text', function (val) {
		if (thisKey)
			thisVal.push(val);
	});
	parser.on('endElement', function (name) {
		if (thisKey) {
			if (name != thisKey)
				winston.error("Unmatched or nested?!");
			curMount[thisKey] = thisVal.join('').trim();
			thisKey = thisVal = null;
		}
		else if (name == 'mount') {
			if (curMount.point)
				mounts[curMount.point] = curMount;
			else
				winston.warn("Unknown mount: " + curMount);
			curMount = null;
		}
		else if (name == 'mounts') {
			parser.removeAllListeners();
			cb(null, mounts);
		}
	});
	parser.on('error', cb);
	parser.parse(input);
}

var reduce_regexp = /&(?:amp|lt|gt|quot);/g;
var reductions = {'&amp;' : '&', '&lt;': '<', '&gt;': '>', '&quot;': '"'};
function reduce_entities(html) {
	return html.replace(reduce_regexp, function (c) {
		return reductions[c];
	});
}

winston.info('Polling ' + ICECAST_POLL_URL + '.');
make_monitor(poll_icecast)();