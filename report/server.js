var caps = require('../server/caps'),
	child_process = require('child_process'),
	config = require('./config'),
	common = require('../common'),
	db = require('../db'),
	etc = require('../etc'),
	http = require('http'),
	mainConfig = require('../config'),
	msgcheck = require('../server/msgcheck'),
	okyaku = require('../server/okyaku'),
	querystring = require('querystring'),
	request = require('request'),
	winston = require('winston'),
	geo = require('geoip-country');

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

function send_modlog(ident, type, content, cb) {
	if(!config.LOG_WEBHOOK_URL){
		if(cb) return cb(null);
		return;
	}
	const responsible =  maybe_mnemonic(ident.ip);
	const rlookup = geo.lookup(ident.ip);
	const rcountry =  rlookup ? rlookup.country : `Unknown ${ident.ip}`;

	if (type === "Ban/Unban") {
		//content here is just the ip that's getting banned and the duration, do the lookup for country and mnemonic here
		let mnemonic = maybe_mnemonic(content.ip);
		let clookup = geo.lookup(content.ip);
		let country =  clookup ? clookup.country : `Unknown ${content.ip}`
		let duration = content.duration === 0 ? "unban" : Number.isInteger(content.duration) ? (content.duration / 1000 +" seconds") : content.duration;
		content = `${content.ip} # ${mnemonic.mnemonic || '???'}${mnemonic.tag || ""}`+"\nCountry: "+country+"\nDuration: "+duration;
	}

	var json = {
			"embeds":[
				{
					"title": type,
					"fields": [
						{
							"name": "Details",
							"value": content,
							"inline": true
						},
						{
							"name": "Responsible",
							"value": (responsible.mnemonic || "???") + (responsible.tag || "")+"\nCountry: "+rcountry,
							"inline": true
						}
					]
				}
			]
		};
	request.post(config.LOG_WEBHOOK_URL,{json: json},
		function(err,resp,body) { //We don't care if it actually logs or not, no need to act on that.
			if(cb) cb(null);
		}
	);	
}
exports.send_modlog = send_modlog;

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
	request.post(config.WEBHOOK_URL,{json: json},
		function(err,resp,body) {
			if(err)
				cb(err);
			cb(null);
		}
	);
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

function validateCaptcha(captchouliID) {
	return new Promise((resolve, reject) => {
		if (!captchouliID) {
			reject("Pretty please?");
			return;
		}

		var postData = querystring.stringify({
			"captchouli-id": captchouliID,
		});
		var options = {
			port: config.CAPTCHASERVER_PORT,
			path: "/status",
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"Content-Length": postData.length,
			},
		};
		var req = http.request(options, function (res) {
			if (res.statusCode !== 200) {
				reject("Captcha-server unreachable");
				return;
			}

			res.setEncoding("utf8");
			res.on("data", function (chunk) {
				if (chunk !== "true") {
					reject("Captcha was not solved.");
					return;
				}
				resolve();
				return;
			});
			res.on("end", function () {});
		});

		req.on("error", function (e) {
			winston.error(e);
			reject("Captcha-server unreachable");
			return;
		});

		// write data to request body
		req.write(postData);
		req.end();
	});
}
exports.validateCaptcha = validateCaptcha;

if(config.REPORTS){
okyaku.dispatcher[common.REPORT_POST] = function (msg, client) {
	if (!msgcheck.check(['id', 'string', 'string'], msg))
		return false;

	var num = msg[0];
	var captchouliID = msg[1];
	var description = msg[2];
	var op = db.OPs[num];
	if (!op || !caps.can_access_thread(client.ident, op))
		return reply_error("Post does not exist.");

	validateCaptcha(captchouliID)
		.then(() => {
			report(client.ident, op, num, description, function (err) {
				if (err) {
					winston.error(err);
					return reply_error("Couldn't send report.");
				}
				// success!
				client.send([op, common.REPORT_POST, num]);
			});
		})
		.catch(reply_error);
	return true;

	/*
	if (!captchouliID)
		return reply_error("Pretty please?");

	var postData = querystring.stringify({
		'captchouli-id' : captchouliID
	});

	var options = {
		port: config.CAPTCHASERVER_PORT,
		method: 'POST',
		path: '/status',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': postData.length
		}
	};

	var req = http.request(options, function(res) {
		if (res.statusCode !== 200)
			return reply_error("Captcha-server unreachable");
		
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			if (chunk !== 'true') 
				return reply_error("Captcha was not solved.");

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
		res.on('end', function() {
		})
	});
	
	req.on('error', function(e) {
		winston.error(e);
		return reply_error("Captcha-server unreachable");
	});
	
	// write data to request body
	req.write(postData);
	req.end();
	return true;
	*/

	function reply_error(err) {
		if (!err)
			err = 'Unknown reCAPTCHA error.';
		var op = db.OPs[num] || 0;
		var msg = {status: 'error', error: err};
		client.send([op, common.REPORT_POST, num, msg]);
		return true;
	}
};
}
