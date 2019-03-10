var caps = require('../server/caps'),
    config = require('./config'),
    common = require('../common'),
    db = require('../db'),
    mainConfig = require('../config'),
    msgcheck = require('../server/msgcheck'),
    okyaku = require('../server/okyaku'),
    recaptcha = require('recaptcha-v2').Recaptcha,
    winston = require('winston'),
    PushBullet = require('pushbullet'),
	geo = require('geoip-country');

var PB = new PushBullet(config.ACCESS_TOKEN);

const ERRORS = {
	'invalid-site-private-key': "Sorry, the server isn't set up with reCAPTCHA properly.",
	'invalid-request-cookie': "Something went wrong with our reCAPTCHA token. Please try again.",
	'incorrect-captcha-sol': "Incorrect.",
	'captcha-timeout': "Sorry, you took too long. Please try again.",
};

var safe = common.safe;

function report(reporter_ident, op, num, description, cb) {

	var board = caps.can_access_thread(reporter_ident, op);
	if (!board)
		return cb("Post does not exist.");

	var reporter = maybe_mnemonic(reporter_ident.ip) || '???';

	var yaku = new db.Yakusoku(board, {auth: 'Moderator'});
	var reader = new db.Reader(yaku);
	var kind = op == num ? 'thread' : 'post';
	reader.get_post(kind, num, {}, function (err, post) {
		if (err || !post) {
			if (err)
				console.error(err);
			send_report(reporter, board, op, num, '', [], cb);
			return;
		}

		var name = (post.name || common.ANON)
		if (name.length > 23)
			name = name.slice(0, 20) + '...';
		if (post.trip)
			name += ' # ' + post.trip.replace(/<(\\|).+?>/g,"");
		if (post.ip) {
			var offender = maybe_mnemonic(post.ip);
			name += ' # ' + offender.mnemonic + (offender.tag ? ' "' + offender.tag + '"' : '');
		}
		var body = 'Reporter Country: ' + geo.lookup(reporter_ident.ip).country;
		body += '\nOffender: ' + name;
		body += '\nOffender Country: ' + geo.lookup(post.ip).country;
		if(description)
			body += '\nDescription: ' + description;

		var img;
		if (post.image && !post.hideimg)
			img = image_preview(post.image);
		if (img) {
			body += '\nThumbnail: ' + img.src;
		}

		send_report(reporter, board, op, num, body, cb);
	});
}

function send_report(reporter, board, op, num, body, cb) {
	var noun;
	var url = config.DOMAIN + board + '/' + op + '?reported';
	if (op == num) {
		noun = 'Thread';
	}
	else {
		noun = 'Post';
		url += '#' + num;
	}

	body = body ? (body + '\n\n' + url) : url;

	var title = noun + ' #' + num + ' reported by ' + reporter.mnemonic + (reporter.tag ? ' "' + reporter.tag + '"' : '');
	PB.note(config.CHANNEL_TAG, title, body, function (err, resp) {
		if (err)
			return cb(err);
		cb(null);
	});
	var details = title + "\n" + body;
	request({
		url: config.WEBHOOK_URL+"/slack",
		method: 'POST',
		json: {
			"content":details
		}
	}, function (err, res, msg){
		if(err)
			return cb(err);
		cb(null)
	});
}

function image_preview(info) {
	if (!info.dims)
		return;
	var tw = info.dims[2], th = info.dims[3];
	if (info.mid) {
		tw *= 2;
		th *= 2;
	}
	if (!tw || !th) {
		tw = info.dims[0];
		th = info.dims[1];
	}
	if (!tw || !th)
		return;

	var tempMediaURL = require('../imager/config').MEDIA_URL.replace(/^\//,'');
	var src;
	if (info.mid)
		src = config.DOMAIN + tempMediaURL + 'mid/' + info.mid;
	else if (info.thumb)
		src = config.DOMAIN + tempMediaURL + 'thumb/' + info.thumb;
	else
		return;

	var title = common.readable_filesize(info.size);
	return {src: src, width: tw, height: th, title: title};
}

function maybe_mnemonic(ip) {
	if (ip && mainConfig.IP_MNEMONIC) {
		var authcommon = require('../admin/common');
		var mnem = authcommon.ip_mnemonic(ip);
		var tag = authcommon.mnemonic_tag(ip);
	}
	return {'mnemonic': mnem, 'tag': tag};
}


okyaku.dispatcher[common.REPORT_POST] = function (msg, client) {
	if (!msgcheck.check(['id', 'string', 'string'], msg))
		return false;

	var num = msg[0];
	data = {
		remoteip: client.ident.ip,
		response: msg[1],
		secret: config.RECAPTCHA_SECRET_KEY
	};
	var description = msg[2];
	var op = db.OPs[num];
	if (!op || !caps.can_access_thread(client.ident, op))
		return reply_error("Post does not exist.");

	if (!data.response)
		return reply_error("Pretty please?");
	if (data.response.length > 10000)
		return reply_error("tl;dr");

	var checker = new recaptcha(config.RECAPTCHA_SITE_KEY, config.RECAPTCHA_SECRET_KEY, data);
	checker.verify(function (ok, err) {
			if (!ok) {
				reply_error(ERRORS[err] || err);
				return;
			}

			var op = db.OPs[num];
			if (!op)
				return reply_error("Post does not exist.");
			report(client.ident, op, num, description, function (err) {
				if (err) {
					winston.error(err);
					return reply_error("Couldn't send report.");
				}
				// success!
				client.send([op, common.REPORT_POST, num]);
			});
		});
	return true;

	function reply_error(err) {
		if (!err)
			err = 'Unknown reCAPTCHA error.';
		var op = db.OPs[num] || 0;
		var msg = {status: 'error', error: err};
		client.send([op, common.REPORT_POST, num, msg]);
		return true;
	}
};
