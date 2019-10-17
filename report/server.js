var caps = require('../server/caps'),
	child_process = require('child_process'),
    config = require('./config'),
    common = require('../common'),
    db = require('../db'),
	etc = require('../etc'),
    mainConfig = require('../config'),
    msgcheck = require('../server/msgcheck'),
    okyaku = require('../server/okyaku'),
    recaptcha = require('recaptcha-v2').Recaptcha,
    winston = require('winston'),
	geo = require('geoip-country');

var curlBin;

etc.which('curl', function (bin) { curlBin = bin; });

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
		var body = {'rcountry': geo.lookup(reporter_ident.ip) ? geo.lookup(reporter_ident.ip).country : "Unknown " + reporter_ident.ip,
			'offender': name,
			'ocountry': geo.lookup(post.ip) ? geo.lookup(post.ip).country : "Unknown " + post.ip,
			'desc': description,
			'thumb': (post.image && !post.hideimg ? image_preview(post.image).src : ''),
			'img': (post.image && !post.hideimg ? image_preview(post.image).full : '')
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

	var title = noun + ' #' + num + ' reported by ' + reporter.mnemonic + (reporter.tag ? ' "' + reporter.tag + '"' : '');
	var message = "Reporter Country: "+body.rcountry+"\nOffender: "+body.offender+"\nOffender Country: "+body.ocountry+(body.desc?"\nDescription: "+body.desc:'')+(body.thumb?"\nThumbnail: "+body.thumb:'')+"\n\n"+url;
	message = message ? message : url;
	var json = {
			"embeds":[
				{
					"title": noun + ' #' + num,
					"url": url,
					"fields": [
						{
							"name": "Offender",
							"value": body.offender+"\u2000\nCountry: "+body.ocountry,
							"inline": true
						},
						{
							"name": "Reporter",
							"value": reporter.mnemonic + (reporter.tag ? ' "' + reporter.tag + '"' : '')+"\nCountry: "+body.rcountry,
							"inline": true
						}
					]
				}
			]
		};
	if(body.desc)
		json.embeds[0].fields.push({
			"name": "Description",
			"value": body.desc
		});
	if(body.thumb)
		json.embeds[0].image = {"url": body.thumb};
	if(body.img)
		json.embeds[0].fields.push({
			"name": "Image Source",
			"value": body.img
		});
	var args = ['-X', 'POST', '--data', JSON.stringify(json),'-H','"Content-Type: application/json"',config.WEBHOOK_URL];
	child_process.execFile(curlBin, args,{},function (err, stdout, stderr) {
		if(err){
			return cb(err);
			}
			cb(null);
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
		src = config.DOMAIN + tempMediaURL + 'src/' + info.src;
	
	var full = config.DOMAIN + tempMediaURL + 'src/' + info.src;
	var title = common.readable_filesize(info.size);
	return {src: src, width: tw, height: th, title: title, full: full};
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
