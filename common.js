var isNode = typeof navigator === 'undefined';

// Define vars, if undefined (on the server)
var DEF = isNode ? exports : {},
	config = config || require('./config'),
	hotConfig = hotConfig || require('./server/state').hot,
	imagerConfig =  imagerConfig || require('./imager/config');

DEF.INVALID = 0;

DEF.INSERT_POST = 2;
DEF.UPDATE_POST = 3;
DEF.FINISH_POST = 4;
DEF.CATCH_UP = 5;
DEF.INSERT_IMAGE = 6;
DEF.SPOILER_IMAGES = 7;
DEF.DELETE_IMAGES = 8;
DEF.DELETE_POSTS = 9;
DEF.DELETE_THREAD = 10;
DEF.LOCK_THREAD = 11;
DEF.UNLOCK_THREAD = 12;
DEF.REPORT_POST = 13;

DEF.IMAGE_STATUS = 31;
DEF.SYNCHRONIZE = 32;
DEF.EXECUTE_JS = 33;
DEF.MOVE_THREAD = 34;
DEF.UPDATE_BANNER = 35;
DEF.TEARDOWN = 36;
DEF.HOT_INJECTION = 38;
DEF.NOTIFICATION = 39;
DEF.POST_ALERT = 40;
DEF.POST_ALERT_SYNC = 41;
DEF.SPOILER_OWN_IMAGE = 42;
DEF.DESYNC = 43;
DEF.RESYNC = 44;

DEF.MODEL_SET = 50;
DEF.COLLECTION_RESET = 55;
DEF.COLLECTION_ADD = 56;
DEF.SUBSCRIBE = 60;
DEF.UNSUBSCRIBE = 61;

DEF.GET_TIME = 62;

DEF.ANON = 'Anonymous';
DEF.INPUT_ROOM = 20;
DEF.MAX_POST_LINES = 30;
DEF.MAX_POST_CHARS = 2000;
DEF.WORD_LENGTH_LIMIT = 120;

DEF.S_NORMAL = 0;
DEF.S_BOL = 1;
DEF.S_QUOTE = 2;
DEF.S_SPOIL = 3;
DEF.S_RED = 4;
DEF.S_BLUE = 5;

if (typeof mediaURL == 'undefined' || !mediaURL)
	mediaURL = imagerConfig.MEDIA_URL;

function is_pubsub(t) {
	return t > 0 && t < 30;
}

function FSM(start) {
	this.state = start;
	this.spec = {acts: {}, ons: {}, wilds: {}, preflights: {}};
}

FSM.prototype.clone = function () {
	var second = new FSM(this.state);
	second.spec = this.spec;
	return second;
};

// Handlers on arriving to a new state
FSM.prototype.on = function (key, f) {
	var ons = this.spec.ons[key];
	if (ons)
		ons.push(f);
	else
		this.spec.ons[key] = [f];
	return this;
};

// Sanity checks before attempting a transition
FSM.prototype.preflight = function (key, f) {
	var pres = this.spec.preflights[key];
	if (pres)
		pres.push(f);
	else
		this.spec.preflights[key] = [f];
};

// Specify transitions and an optional handler function
FSM.prototype.act = function (trans_spec, on_func) {
	var halves = trans_spec.split('->');
	if (halves.length != 2)
		throw new Error("Bad FSM spec: " + trans_spec);
	var parts = halves[0].split(',');
	var dest = halves[1].match(/^\s*(\w+)\s*$/)[1];
	var tok;
	for (var i = parts.length-1; i >= 0; i--) {
		var part = parts[i];
		var m = part.match(/^\s*(\*|\w+)\s*(?:\+\s*(\w+)\s*)?$/);
		if (!m)
			throw new Error("Bad FSM spec portion: " + part);
		if (m[2])
			tok = m[2];
		if (!tok)
			throw new Error("Tokenless FSM action: " + part);
		var src = m[1];
		if (src == '*')
			this.spec.wilds[tok] = dest;
		else {
			var acts = this.spec.acts[src];
			if (!acts)
				this.spec.acts[src] = acts = {};
			acts[tok] = dest;
		}
	}
	if (on_func)
		this.on(dest, on_func);
	return this;
};

FSM.prototype.feed = function (ev, param) {
	var spec = this.spec;
	var from = this.state, acts = spec.acts[from];
	var to = (acts && acts[ev]) || spec.wilds[ev];
	if (to && from != to) {
		var ps = spec.preflights[to];
		for (var i = 0; ps && i < ps.length; i++)
			if (!ps[i].call(this, param))
				return false;
		this.state = to;
		var fs = spec.ons[to];
		for (var i = 0; fs && i < fs.length; i++)
			fs[i].call(this, param);
	}
	return true;
};

FSM.prototype.feeder = function (ev) {
	var self = this;
	return function (param) {
		self.feed(ev, param);
	};
};

var entities = {'&' : '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'};
function escape_html(html) {
	return html.replace(/[&<>"]/g, function (c) {
		return entities[c];
	});
}

function escape_fragment(frag) {
	var t = typeof(frag);
	if (t == 'object' && frag && typeof(frag.safe) == 'string')
		return frag.safe;
	else if (t == 'string')
		return escape_html(frag);
	else if (t == 'number')
		return frag.toString();
	else
		return '???';
}

function flatten(frags) {
	var out = [];
	for (var i = 0; i < frags.length; i++) {
		var frag = frags[i];
		if (Array.isArray(frag))
			out = out.concat(flatten(frag));
		else
			out.push(escape_fragment(frag));
	}
	return out;
}

function safe(frag) {
	return {safe: frag};
}

function is_noko(email) {
	return email && email.indexOf('@') == -1 && /noko/i.test(email);
}

function is_sage(email) {
	return hotConfig.SAGE_ENABLED && email &&
			email.indexOf('@') == -1 && /sage/i.test(email);
}


var OneeSama = function (t) {
	this.tamashii = t;
	this.hooks = {};
};

var OS = OneeSama.prototype;

var break_re = new RegExp("(\\S{" + DEF.WORD_LENGTH_LIMIT + "})");

// Internal refs, embeds
var ref_re = '>>(\\d+';
ref_re += '|>\\/watch\\?v=[\\w-]{11}(?:#t=[\\dhms]{1,9})?';
ref_re += '|>\\/soundcloud\\/[\\w-]{1,40}\\/[\\w-]{1,80}';
ref_re += '|>\\/korbo\\/';
ref_re += '|>\\/cumzone\\/';
ref_re += '|>\\/pastebin\\/\\w+';

for (var i = 0; i < config.BOARDS.length; i++) {
    ref_re += '|>\\/' + config.BOARDS[i] + '\\/(?:\\d+)?';
}

ref_re += ')';
ref_re = new RegExp(ref_re);

OS.hook = function (name, func) {
	var hs = this.hooks[name];
	if (!hs)
		this.hooks[name] = hs = [func];
	else if (hs.indexOf(func) < 0)
		hs.push(func);
};

OS.trigger = function (name, param) {
	var hs = this.hooks[name];
	if (hs)
		for (var i = 0; i < hs.length; i++)
			hs[i].call(this, param);
};

function override(obj, orig, upgrade) {
	var origFunc = obj[orig];
	obj[orig] = function () {
		var args = [].slice.apply(arguments);
		args.unshift(origFunc);
		return upgrade.apply(this, args);
	};
}

OS.red_string = function (ref) {
	var dest, linkClass;
	if (/^>\/watch/.test(ref)) {
		dest = 'https://www.youtube.com/' + ref.slice(2);
		linkClass = 'embed watch';
	}
	else if (/^>\/soundcloud/.test(ref)) {
		dest = 'https://soundcloud.com/' + ref.slice(13);
		linkClass = 'embed soundcloud';
	}
	else if (/^>\/pastebin/.test(ref)){
		dest = dest = 'https://pastebin.com/' + ref.slice(11);
		linkClass = 'embed pastebin';
	}
	else if (/>\/korbo/.test(ref)){
		dest = '../korbo/';
	}
	else if (/>\/cumzone/.test(ref)){
		dest = '../cumzone/';
	}

	// Linkify >>>/board/ URLs
	var board;
	for (var i = 0; i < config.BOARDS.length; i++) {
		board = config.BOARDS[i];
		if (!new RegExp('^>\\/' + board + '\\/').test(ref))
			continue;
		dest = '../' + board;
		linkClass = '';
		break;
	}

	if (!dest) {
		this.tamashii(parseInt(ref, 10));
		return;
	}
	this.callback(new_tab_link(encodeURI(dest), '>>' + ref, linkClass));
};

OS.break_heart = function (frag) {
	if (frag.safe)
		return this.callback(frag);
	var bits = frag.split(break_re);
	for (var i = 0; i < bits.length; i++) {
		/* anchor refs */
		var morsels = bits[i].split(ref_re);
		for (var j = 0; j < morsels.length; j++) {
			var m = morsels[j];
			if (j % 2)
				this.red_string(m);
			else if (i % 2) {
				this.geimu(m);
				this.callback(safe('<wbr>'));
			}
			else
				this.geimu(m);
		}
	}
};

OS.iku = function (token, to) {
	var state = this.state;
	if (state[0] == DEF.S_QUOTE && to != DEF.S_QUOTE)
		this.callback(safe('</em>'));
	if (state[0] == DEF.S_RED && to != DEF.S_RED)
		this.callback(safe('</h4>'));
	if (state[0] == DEF.S_BLUE && to != DEF.S_BLUE)
		this.callback(safe('</h5>'));
	switch (to) {
	case DEF.S_QUOTE:
		if (state[0] != DEF.S_QUOTE) {
			this.callback(safe('<em>'));
			state[0] = DEF.S_QUOTE;
		}
		this.break_heart(token);
		break;
	case DEF.S_SPOIL:
		if (token[1] == '/') {
			state[1]--;
			this.callback(safe('</del>'));
		}
		else {
			var del = {html: '<del>'};
			this.trigger('spoilerTag', del);
			this.callback(safe(del.html));
			state[1]++;
		}
		break;
	case DEF.S_RED:
		if (state[0] != DEF.S_RED) {
			this.callback(safe('<h4>'));
			state[0] = DEF.S_RED;
		}
		this.break_heart(token);
		break;
	case DEF.S_BLUE:
		if (state[0] != DEF.S_BLUE) {
			this.callback(safe('<h5>'));
			state[0] = DEF.S_BLUE;
		}
		this.break_heart(token);
		break;
	default:
		this.break_heart(token);
		break;
	}
	state[0] = to;
};

OS.fragment = function (frag) {
	var chunks = frag.split(/(\[\/?spoiler\])/i);
	var state = this.state;
	for (var i = 0; i < chunks.length; i++) {
		var chunk = chunks[i], q = (state[0] === DEF.S_QUOTE ||
			state[0] === DEF.S_RED ||
			state[0] === DEF.S_BLUE);
		if (i % 2) {
			var to = DEF.S_SPOIL;
			if (chunk[1] == '/' && state[1] < 1)
				to = q ? state[0] : DEF.S_NORMAL;
			this.iku(chunk, to);
			continue;
		}
		lines = chunk.split(/(\n)/);
		for (var l = 0; l < lines.length; l++) {
			var line = lines[l];
			if (l % 2)
				this.iku(safe('<br>'), DEF.S_BOL);
			else if (state[0] === DEF.S_BOL && line[0] == '>')
				this.iku(line, DEF.S_QUOTE);
			else if (state[0] === DEF.S_BOL && line[0] == '!')
				this.iku(line, DEF.S_RED);
			else if (state[0] === DEF.S_BOL && line[0] == '`')
				this.iku(line, DEF.S_BLUE);
			else if (line)
				this.iku(line, q ? state[0]
						: DEF.S_NORMAL);
		}
	}
};

OS.karada = function (body) {
	var output = [];
	this.state = [DEF.S_BOL, 0];
	this.callback = function (frag) { output.push(frag); }
	this.fragment(body);
	this.callback = null;
	if (this.state[0] == DEF.S_QUOTE)
		output.push(safe('</em>'));
	if (this.state[0] == DEF.S_RED)
		output.push(safe('</h4>'));
	if (this.state[0] == DEF.S_BLUE)
		output.push(safe('</h5>'));
	for (var i = 0; i < this.state[1]; i++)
		output.push(safe('</del>'));
	return output;
};


var dice_re = /(#flip|#awoo|#1ball|#8ball|#9ball|bully|#bcount|#btotal|#russian|#sw(?:\d{1,2}:)?\d{1,2}:\d{1,2}(?:[+-]\d+)?|#\d{0,2}d\d{1,4}(?:[+-]\d{1,4})?)/i;


function parse_dice(frag) {
	if (frag == '#flip')
		return {n: 1, faces: 2};
	if (frag == '#awoo')
		return {n: 1, faces: hotConfig.AWOO.length};
	if (frag == '#8ball')
	 	return {n: 1, faces: hotConfig.EIGHT_BALL.length};
        if (frag == '#1ball')
         	return {n: 1, faces: hotConfig.ONE_BALL.length};
        if (frag == '#9ball')
         	return {n: 1, faces: hotConfig.NINE_BALL.length};
	// Increment counter
	if (frag.toLowerCase() == 'bully')
		return {bully: 'increment'};
	// Print current thread count
	if (frag == '#bcount')
		return {bully: 'print'};
	// Print total count
	if (frag == '#btotal')
		return {bully: 'total'};
	var m = frag.match(/^#(\d*)d(\d+)([+-]\d+)?$/i);
	// Russian Roulette Ban
	if (frag.toLowerCase() == '#russian'){
		return {russian: {time: serverTime(), countdown: config.SELFBANDELAY, chance: config.SELFBANCHANCE}};
	}
	// Regular dice
	if (m){
		var n = parseInt(m[1], 10) || 1, faces = parseInt(m[2], 10);
		if (n < 1 || n > 10 || faces < 2 || faces > 100)
			return false;
		var info = {n: n, faces: faces};
		if (m[3])
			info.bias = parseInt(m[3], 10);
		return info;
	}
	var sw = frag.match(/^#sw(\d+:)?(\d+):(\d+)([+-]\d+)?$/i);//first capture group may or may not be present.
	if (sw){
		var hour= parseInt(sw[1], 10) || 0,
			min = parseInt(sw[2], 10),
			sec = parseInt(sw[3], 10);
		var time = serverTime();
		// Offset the start. If the start is in the future,
		// a countdown will be displayed
		if (sw[4]){
			var symbol = sw[4].slice(0, 1);
			var offset = sw[4].slice(1) * 1000;
			time = symbol == '+' ? time + offset : time - offset;
		}
		var end = ((hour*60+min)*60+sec)*1000+time;
		return {hour:hour,min: min,sec:sec,start:time,end:end};
	}
}

function serverTime() {
	var d = new Date().getTime();
	// On the server or time difference not compared yet
	if (isNode || !serverTimeOffset)
		return d;
	return d + serverTimeOffset;
}

function readable_dice(bit, d) {
	if (bit == '#flip')
		return '#flip (' + (d[1] == 2) + ')';
	if (bit == '#awoo')
		return hotConfig.AWOO[d[1]- 1];
	if (bit == '#8ball')
		return '#8ball (' + hotConfig.EIGHT_BALL[d[1]- 1] + ')';
        if (bit == '#1ball')
                return '#1ball (' + hotConfig.ONE_BALL[d[1]- 1] + ')';
        if (bit == '#9ball')
                return '#9ball (' + hotConfig.NINE_BALL[d[1]- 1] + ')';
	if (bit.toLowerCase() == 'bully')
		return bit;
	if (bit == '#bcount')
		return '(' + d + ' people called a bully in this thread.)';
	if (bit == '#btotal')
		return '(' + d + ' people called a bully.)';
	if(/^#sw/.test(bit)){
		return safe('<syncwatch class="embed" start='+d[0].start+
				" end="+d[0].end+
				" hour="+d[0].hour+
				" min="+d[0].min+
				" sec="+d[0].sec+
				' >syncwatch</syncwatch>');
	}
	if(bit.toLowerCase() == '#russian'){
		var time = d[0].russianTime + d[0].russianCountdown;
		return safe(bit+' <syncwatch class="embed" start='+time+
				" end="+time+
				" hour="+0+
				" min="+0+
				" sec="+0+
				" type=russian"+
				" result="+d[0].result+
				' >russian</syncwatch>');
	}
	var f = d[0], n = d.length, b = 0;
	if (d[n-1] && typeof d[n-1] == 'object') {
		b = d[n-1].bias;
		n--;
	}
	var r = d.slice(1, n);
	n = r.length;
	bit += ' (';
	var eq = n > 1 || b;
	if (eq)
		bit += r.join(', ');
	if (b)
		bit += (b < 0 ? ' - ' + (-b) : ' + ' + b);
	var sum = b;
	for (var j = 0; j < n; j++)
		sum += r[j];
	return bit + (eq ? ' = ' : '') + sum + ')';
}

OS.geimu = function (text) {
	if (!this.dice) {
		this.eLinkify ? this.linkify(text) : this.callback(text);
		return;
	}

	var bits = text.split(dice_re);
	for (var i = 0; i < bits.length; i++) {
		var bit = bits[i];
		if (!(i % 2) || !parse_dice(bit)) {
			this.eLinkify ? this.linkify(bit) : this.callback(bit);
		}
		else if (this.queueRoll) {
			this.queueRoll(bit);
		}
		else if (!this.dice[0]) {
			this.eLinkify ? this.linkify(bit) : this.callback(bit);
		}
		else {
			var d = this.dice.shift();
			this.callback(safe('<strong>'));
			this.strong = true; // for client DOM insertion
			this.callback(readable_dice(bit, d));
			this.strong = false;
			this.callback(safe('</strong>'));
		}
	}
};

OS.linkify = function (text) {

	var bits = text.split(/(https?:\/\/[^\s"<>]*[^\s"<>'.,!?:;])/);
	for (var i = 0; i < bits.length; i++) {
		if (i % 2) {
			var e = escape_html(bits[i]);
			// open in new tab, and disavow target
			this.callback(safe('<a href="' + e +
					'" rel="nofollow" target="_blank">' +
					e + '</a>'));
		}
		else
			this.callback(bits[i]);
	}
};

function chibi(imgnm, src) {
	var name = '', ext = '';
	var m = imgnm.match(/^(.*)(\.\w{3,4})$/);
	if (m) {
		name = m[1];
		ext = m[2];
	}
	var bits = [safe('<a href="'), src, safe('" download="'), imgnm];
	if (name.length >= 38) {
		bits.push(safe('" title="'), imgnm);
		imgnm = [name.slice(0, 30), safe('(&hellip;)'), ext];
	}
	bits.push(safe('" rel="nofollow">'), imgnm, safe('</a>'));
	return bits;
}

OS.spoiler_info = function (index, toppu) {
	var large = toppu || this.thumbStyle == 'large';
	var hd = toppu || this.thumbStyle != 'small';
	return {
		thumb: encodeURI(mediaURL + 'kana/spoiler' + (hd ? '' : 's')
				+ index + '.png'),
		dims: large ? imagerConfig.THUMB_DIMENSIONS
				: imagerConfig.PINKY_DIMENSIONS,
	};
};

var spoilerImages = imagerConfig.SPOILER_IMAGES;

function pick_spoiler(metaIndex) {
	var imgs = spoilerImages;
	var n = imgs.length;
	var i;
	if (metaIndex < 0)
		i = Math.floor(Math.random() * n);
	else
		i = metaIndex % n;
	return {index: imgs[i], next: (i+1) % n};
}

function new_tab_link(srcEncoded, inside, cls) {
	return [safe('<a href="' + srcEncoded + '" target="_blank"' +
		(cls ? ' class="'+cls+'"' : '') +
		' rel="nofollow">'), inside, safe('</a>')];
}

function image_sauce_id(src) {
	return [safe('<a href="/outbound/sn/' + src + '" target="_blank" rel="nofollow">'),
	'SN', safe('</a>'), ' ',
	safe('<a href="/outbound/iq/' + src + '" target="_blank" rel="nofollow">'),
	'IQ', safe('</a>'), ' ',
	safe('<a href="/outbound/io/' + src + '" target="_blank" rel="nofollow">'),
	'iOps', safe('</a>')];
}

OS.image_paths = function () {
	if (!this._imgPaths) {
		this._imgPaths = {
			src: mediaURL + 'src/',
			thumb: mediaURL + 'thumb/',
			mid: mediaURL + 'mid/',
			vint: mediaURL + 'vint/',
		};
		this.trigger('mediaPaths', this._imgPaths);
	}
	return this._imgPaths;
};

var audioIndicator = "\u266B"; // musical note
var soundInformation = '\u24D8'; // circled information source

OS.gazou = function (info, toppu) {
	var src, name, caption;
	if (info.vint) {
		src = encodeURI('../outbound/hash/' + info.MD5);
		var google = encodeURI('../outbound/g/' + info.vint);
		var iqdb = encodeURI('../outbound/iqdb/' + info.vint);
		caption = ['Search ', new_tab_link(google, '[Google]'), ' ',
			new_tab_link(iqdb, '[iqdb]'), ' ',
			new_tab_link(src, '[foolz]')];
	}
	else {
		src = encodeURI(this.image_paths().src + info.src);
		caption = [
			(/\.(mp3|ogg|wav)/.test(info.src)?'Audio':
			(this.sauceToggle?image_sauce_id(info.mid):
			(/\.(webm|mp4)/.test(info.src)?'Video':'Image'))), ' ',
			new_tab_link(src, (this.thumbStyle == 'hide') ? '[Show]' : info.src, 'imageSrc')
		];
	}

	var img = this.gazou_img(info, toppu);
	var dims = info.dims[0] + 'x' + info.dims[1];

	var songTitleText = (info.artist ? info.artist : '') +
	(info.artist && info.title ? ' - ' : '') +
	(info.title ? info.title : '');

	// We need da data for da client to walk da podium

	return [safe('<figure data-img="'), (isNode ? escapeJSON(info) : ''),
		safe(info.spoiler ? '" data-spoiler="' : ''), info.spoiler || '',
		safe('"><figcaption>'),
		caption, safe(' <i>('),
		(this.spoilToggle && info.spoiler ? 'Spoiler, ' : ''),
		info.audio ? (audioIndicator + ', ') : '',
		(info.songTitle || info.artist) ?
		[safe('<abbr style="font-weight: bold;" title="'), songTitleText,
		safe('">'), soundInformation, safe('</abbr>'), ', '] : '',
		info.length ? (info.length + ', ') : '',
		readable_filesize(info.size),
		/\.(mp3|ogg|wav)/.test(info.src) ? '' : [', ', dims],
		(info.apng ? ', APNG' : ''),
		this.full ? [', ', chibi(info.imgnm, img.src)] : '',
		safe(')</i></figcaption>'),
		this.thumbStyle == 'hide' ? '' : img.html,
		safe('</figure>\n\t')];
};

thumbStyles = ['small', 'sharp', 'large', 'hide'];

OS.gazou_img = function (info, toppu, href) {
	var src, thumb;
	var imgPaths = this.image_paths();
	var matchGIF = info.src ? /.gif$/.test(info.src) : false;
	var matchSVG = info.src ? /.svg$/.test(info.src) : false;
	if (!info.vint)
		src = thumb = encodeURI(imgPaths.src + info.src);

	var d = info.dims;
	var w = d[0], h = d[1], tw = d[2], th = d[3];
	if (info.spoiler && !this.spoilToggle) {
		var sp = this.spoiler_info(info.spoiler, toppu);
		thumb = sp.thumb;
		tw = sp.dims[0];
		th = sp.dims[1];
	}
	else if (info.vint) {
		tw = tw || w;
		th = th || h;
		src = encodeURI('../outbound/hash/' + info.MD5);
		thumb = imgPaths.vint + info.vint;
	}
	else if ((matchGIF && this.autoGif) || matchSVG) {
		thumb = src;
		if (!toppu && this.thumbStyle == 'large') {
			tw *= 2;
			th *= 2;
		}
	}
	else if (this.thumbStyle != 'small' && info.mid) {
		thumb = encodeURI(imgPaths.mid + info.mid);
		if (!toppu && this.thumbStyle == 'large') {
			tw *= 2;
			th *= 2;
		}
	}
	else if (info.thumb)
		thumb = encodeURI(imgPaths.thumb + info.thumb);
	else {
		tw = w;
		th = h;
	}

	var img = '<img src="'+thumb+'"';
	if (tw && th)
		img += ' width="'+tw+'" height="'+th+'">';
	else
		img += '>';
	if (imagerConfig.IMAGE_HATS)
		img = '<span class="hat"></span>' + img;
	// Override src with href, if specified
	img = new_tab_link(href || src, safe(img));
	return {html: img, src: src};
};

function escapeJSON(obj){
	return encodeURIComponent(JSON.stringify(obj));
}

function catchJSON(string){
	return JSON.parse(decodeURIComponent(string));
}

function readable_filesize(size) {
	/* Dealt with it. */
	if (size < 1024)
		return size + ' B';
	if (size < 1048576)
		return Math.round(size / 1024) + ' KB';
	size = Math.round(size / 104857.6).toString();
	return size.slice(0, -1) + '.' + size.slice(-1) + ' MB';
}

function pad(n) {
	return (n < 10 ? '0' : '') + n;
}

OS.readable_time = function (time) {
	var h = this.tz_offset;
	var offset;
	if (h || h == 0)
		offset = h * 60 * 60 * 1000;
	else /* would be nice not to construct new Dates all the time */
		offset = new Date().getTimezoneOffset() * -60 * 1000;
	var d = new Date(time + offset);
	var k = "日月火水木金土"[d.getUTCDay()];
	return (d.getUTCFullYear() + '/' + pad(d.getUTCMonth()+1) + '/' +
		pad(d.getUTCDate()) + '&nbsp;(' + k + ') ' +
		pad(d.getUTCHours()) + ':' +
		pad(d.getUTCMinutes()));
};

// Readable elapsed time since post
OS.relative_time = function(then, now){
	var min  = Math.floor((now - then) / (60 * 1000));
	if (min < 1)
		return 'just now';
	if (min < 60)
		return format_time(min, 'minute');
	var hours = Math.floor(min/60);
	if (hours < 24)
		return format_time(hours, 'hour');
	var days = Math.floor(hours/24);
	if (days < 30)
		return format_time(days, 'day');
	var months = Math.floor(days/30);
	if (months < 12)
		return format_time(months, 'month');
	return format_time(Math.floor(months/12), 'year');
};

function format_time(time, unit){
	return pluralize(time, unit) + ' ago';
}

function datetime(time) {
	var d = new Date(time);
	return (d.getUTCFullYear() + '-' + pad(d.getUTCMonth()+1) + '-' +
		pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' +
		pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + 'Z');
}

OS.post_url = function (num, op, quote) {
	op = op || num;
	return (this.op == op ? '' : op) + (quote ? '#q' : '#') + num;
};

OS.post_ref = function (num, op, desc_html) {
	var ref = '&gt;&gt;' + num;
	if (desc_html)
		ref += ' ' + desc_html;
	else if (this.op && this.op != op)
		ref += ' \u2192';
	else if (num == op && this.op == op)
		ref += ' (OP)';
	return safe('<a href="'+this.post_url(num, op, false)+'">'+ref+'</a>');
};

OS.post_nav = function (post) {
	var n = post.num, o = post.op;
	return safe('<nav><a href="' + this.post_url(n, o, false) +
			'">No.</a><a href="' + this.post_url(n, o, true) +
			'">' + n + '</a></nav>');
};

function action_link_html(href, name, id) {
	return '<span class="act"><a href="'+href+'"'+ (id?' id="'+id+'"':'') +'>'+name+'</a></span>';
}

reasonable_last_n = function (n) {
	return n >= 5 && n <= 500;
};

OS.last_n_html = function (num) {
	return action_link_html(num + '?last=' + this.lastN,
			'Last&nbsp;' + this.lastN);
};

OS.expansion_links_html = function (num, omit) {
	var html = ' &nbsp; ' + action_link_html(num, 'Expand');
	if (omit > this.lastN)
		html += ' ' + this.last_n_html(num);
	return html;
};

OS.atama = function (data) {
	var auth = data.auth;
	var header = auth ? [safe('<b class="'),auth.toLowerCase(),safe('">')]
			: [safe('<b>')];
	if (data.subject)
		header.unshift(safe('<h3>「'), data.subject, safe('」</h3> '));
	if (data.name || !data.trip) {
		header.push(data.name || DEF.ANON);
		if (data.trip)
			header.push(' ');
	}
	if (data.trip)
		header.push(safe('<code>' + data.trip + '</code>'));
	if (auth)
		header.push(' ## ' + (auth == 'Admin' ? hotConfig.ADMIN_ALIAS : hotConfig.MOD_ALIAS));
	this.trigger('headerName', {header: header, data: data});
	header.push(safe('</b>'));
	if (data.email) {
		header.unshift(safe('<a class="email" href="mailto:'
			+ encodeURI(data.email) + '" target="_blank">'));
		header.push(safe('</a>'));
	}
	// Format according to client's relative post timestamp setting
	var title = this.rTime ? this.readable_time(data.time) : '';
	var text = this.rTime ? this.relative_time(data.time, new Date().getTime()) : this.readable_time(data.time);
	header.push(safe(' <time datetime="' + datetime(data.time) + '"' +
		'title="' + title + '"' +
		'>' + text + '</time> '),
		this.post_nav(data));
	if (!this.full && !data.op) {
		var ex = this.expansion_links_html(data.num, data.omit);
		header.push(safe(ex));
	}
	this.trigger('headerFinish', {header: header, data: data});
	header.unshift(safe('<header>'));
	header.push(safe('</header>\n\t'));
	return header;
};

OS.monogatari = function (data, toppu) {
	var tale = {header: this.atama(data)};
	this.dice = data.dice;
	var body = this.karada(data.body);
	tale.body = [safe(
		'<blockquote' +
			(isNode ? ' data-body="'+ escapeJSON(data.body) +'"' : '') +'>'),
		body, safe('</blockquote>'
	)];
	if (data.image && !data.hideimg)
		tale.image = this.gazou(data.image, toppu);
	return tale;
};

OS.mono = function (data) {
	var info = {
		data: data,
		classes: data.editing ? ['editing'] : [],
		style: ''
	};
	this.trigger('openArticle', info);
	var cls = info.classes.length && info.classes.join(' '),
	    o = safe('\t<article id="'+data.num+'"' +
			(cls ? ' class="'+cls+'"' : '') +
			(info.style ? ' style="'+info.style+'"' : '') +
			'>'),
	    c = safe('</article>\n'),
	    gen = this.monogatari(data, false);
	return flatten([o, gen.header, gen.image || '', gen.body, c]).join('');
};

OS.monomono = function (data, cls) {
	if (data.locked)
		cls = cls ? cls+' locked' : 'locked';
	var style;
	var o = safe('<section id="' + data.num +
		(cls ? '" class="' + cls : '') +
		(style ? '" style="' + style : '') +
		'" data-sync="' + (data.hctr || 0) +
		(data.full ? '' : '" data-imgs="'+data.imgctr) + '">'),
	    c = safe('</section>\n'),
	    gen = this.monogatari(data, true);
	return flatten([o, gen.image || '', gen.header, gen.body, '\n', c]);
};

function pluralize(n, noun) {
	return n + ' ' + noun + (n == 1 ? '' : 's');
}

function abbrev_msg(omit, img_omit) {
	return omit + (omit==1 ? ' reply' : ' replies') + (img_omit
		? ' and ' + pluralize(img_omit, 'image')
		: '') + ' omitted.';
};

parse_name = function (name) {
	var tripcode = '', secure = '';
	var hash = name.indexOf('#');
	if (hash >= 0) {
		tripcode = name.substr(hash+1);
		name = name.substr(0, hash);
		hash = tripcode.indexOf('#');
		if (hash >= 0) {
			secure = escape_html(tripcode.substr(hash+1));
			tripcode = tripcode.substr(0, hash);
		}
		tripcode = escape_html(tripcode);
	}
	name = name.trim().replace(hotConfig.EXCLUDE_REGEXP, '');
	return [name.substr(0, 100), tripcode.substr(0, 128),
			secure.substr(0, 128)];
};

function random_id() {
	return Math.floor(Math.random() * 1e16) + 1;
}

// Batch exports. We don't wan't these on the client.
if (isNode){
	exports.is_pubsub = is_pubsub;
	exports.FSM = FSM;
	exports.escape_html = escape_html;
	exports.escape_fragment = escape_fragment;
	exports.flatten = flatten;
	exports.safe = safe;
	exports.is_noko = is_noko;
	exports.is_sage = is_sage;
	exports.OneeSama = OneeSama;
	exports.dice_re = dice_re;
	exports.parse_dice = parse_dice;
	exports.pick_spoiler = pick_spoiler;
	exports.thumbStyles = thumbStyles;
	exports.readable_filesize = readable_filesize;
	exports.action_link_html = action_link_html;
	exports.reasonable_last_n = reasonable_last_n;
	exports.pluralize = pluralize;
	exports.abbrev_msg = abbrev_msg;
	exports.parse_name = parse_name;
}
