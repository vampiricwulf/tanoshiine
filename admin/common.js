// Define vars both on server and client
var _, common, config, DEF,
	isNode = typeof navigator === 'undefined';

if (isNode) {
	_ = require('underscore');
	common = require('../common');
	config = require('../config');
	DEF = exports;
}
else {
	_ = window._;
	common = window;
	config = window.config;
	DEF = window.DEF;
}

DEF.FETCH_ADDRESS = 101;
DEF.SET_ADDRESS_NAME = 102;
DEF.BAN = 103;

var modCache = {}; // TEMP

var suspensionKeys = ['boxes', 'bans', 'slows', 'suspensions', 'timeouts'];

var delayNames = ['now', 'soon', 'later'];
var delayDurations = {now: 0, soon: 60, later: 20*60};

var kanji_dict = [0x4E00, 0x4E03, 0x4E09, 0x4E0A, 0x4E0B, 0x4E2D, 0x4E5D, 
				0x4E8C, 0x4E94, 0x4EBA, 0x4F11, 0x5148, 0x5165, 0x516B, 
				0x516D, 0x5186, 0x51FA, 0x529B, 0x5341, 0x5343, 0x53E3, 
				0x53F3, 0x540D, 0x56DB, 0x571F, 0x5915, 0x5927, 0x5929, 
				0x5973, 0x5B50, 0x5B57, 0x5B66, 0x5C0F, 0x5C71, 0x5DDD, 
				0x5DE6, 0x5E74, 0x624B, 0x6587, 0x65E5, 0x65E9, 0x6708, 
				0x6728, 0x672C, 0x6751, 0x6797, 0x6821, 0x68EE, 0x6B63, 
				0x6C17, 0x6C34, 0x706B, 0x72AC, 0x7389, 0x738B, 0x751F, 
				0x7530, 0x7537, 0x753A, 0x767D, 0x767E, 0x76EE, 0x77F3, 
				0x7A7A, 0x7ACB, 0x7AF9, 0x7CF8, 0x8033, 0x82B1, 0x8349, 
				0x866B, 0x898B, 0x8C9D, 0x8D64, 0x8DB3, 0x8ECA, 0x91D1, 
				0x96E8, 0x9752, 0x97F3, 0x4E07, 0x4E38, 0x4EA4, 0x4EAC, 
				0x4ECA, 0x4F1A, 0x4F53, 0x4F55, 0x4F5C, 0x5143, 0x5144, 
				0x5149, 0x516C, 0x5185, 0x51AC, 0x5200, 0x5206, 0x5207, 
				0x524D, 0x5317, 0x5348, 0x534A, 0x5357, 0x539F, 0x53CB, 
				0x53E4, 0x53F0, 0x5408, 0x540C, 0x56DE, 0x56F3, 0x56FD, 
				0x5712, 0x5730, 0x5834, 0x58F0, 0x58F2, 0x590F, 0x5916, 
				0x591A, 0x591C, 0x592A, 0x59B9, 0x59C9, 0x5BA4, 0x5BB6, 
				0x5BFA, 0x5C11, 0x5CA9, 0x5DE5, 0x5E02, 0x5E30, 0x5E83, 
				0x5E97, 0x5F13, 0x5F15, 0x5F1F, 0x5F31, 0x5F37, 0x5F53, 
				0x5F62, 0x5F8C, 0x5FC3, 0x601D, 0x6238, 0x624D, 0x6559, 
				0x6570, 0x65B0, 0x65B9, 0x660E, 0x661F, 0x6625, 0x663C, 
				0x6642, 0x6674, 0x66DC, 0x66F8, 0x671D, 0x6765, 0x6771, 
				0x697D, 0x6B4C, 0x6B62, 0x6B69, 0x6BCD, 0x6BCE, 0x6BDB, 
				0x6C60, 0x6C7D, 0x6D3B, 0x6D77, 0x70B9, 0x7236, 0x725B, 
				0x7406, 0x7528, 0x753B, 0x756A, 0x76F4, 0x77E2, 0x77E5, 
				0x793E, 0x79CB, 0x79D1, 0x7B54, 0x7B97, 0x7C73, 0x7D19, 
				0x7D30, 0x7D44, 0x7D75, 0x7DDA, 0x7FBD, 0x8003, 0x805E, 
				0x8089, 0x81EA, 0x8239, 0x8272, 0x8336, 0x884C, 0x897F, 
				0x89AA, 0x89D2, 0x8A00, 0x8A08, 0x8A18, 0x8A71, 0x8A9E, 
				0x8AAD, 0x8C37, 0x8CB7, 0x8D70, 0x8FD1, 0x901A, 0x9031, 
				0x9053, 0x9060, 0x91CC, 0x91CE, 0x9577, 0x9580, 0x9593, 
				0x96EA, 0x96F2, 0x96FB, 0x982D, 0x9854, 0x98A8, 0x98DF, 
				0x9996, 0x99AC, 0x9AD8, 0x9B5A, 0x9CE5, 0x9CF4, 0x9EA6, 
				0x9EC4, 0x9ED2, 0x4E01, 0x4E16, 0x4E21, 0x4E3B, 0x4E57, 
				0x4E88, 0x4E8B, 0x4ED5, 0x4ED6, 0x4EE3, 0x4F4F, 0x4F7F, 
				0x4FC2, 0x500D, 0x5168, 0x5177];

function ip_mnemonic(ip) {
	if (/^[a-fA-F0-9:]{3,45}$/.test(ip))
		return ipv6_mnemonic(ip);
	if (!is_IPv4_ip(ip))
		return null;
	var nums = ip.split('.');
	var mnemonic = '';
	for (var i = 0; i < 2; i++) {
		var n = parseInt(nums[i], 10) ^ parseInt(nums[i+2], 10);
		var s = String.fromCharCode(kanji_dict[n]);
		mnemonic += s;
	}
	return mnemonic;
}

function ipv6_mnemonic(ip) {
	var groups = explode_IPv6_ip(ip);
	if (!groups || groups.length != 8)
		return null;
	var mnemonic = '';
	for (var i = 0; i < 4; i++) {
		var n = (parseInt(groups[i], 16) ^ parseInt(groups[i+4], 16)) % 256;
		var s = String.fromCharCode(kanji_dict[n]);
		mnemonic += s;
	}
	return mnemonic;
}

function append_mnemonic(info) {
	var header = info.header, ip = info.data.ip;
	if (!ip)
		return;
	var mnemonic = config.IP_MNEMONIC && ip_mnemonic(ip);
	var key = ip_key(ip);

	// Terrible hack.
	if (mnemonic && modCache.addresses) {
		var addr = modCache.addresses[key];
		if (addr && addr.name && config.IP_TAGGING)
			mnemonic += ' "' + addr.name + '"';
	}

	var s = common.safe;
	var title = mnemonic ? [s(' title="'), ip, s('"')] : '';
	header.push(s(' <a class="mod addr"'), title, s('>'),
			mnemonic || ip, s('</a>'));
}

function append_mnemonic_no_ip(info) {
	var header = info.header, ip = info.data.ip;
	if (!ip)
		return;
	var mnemonic = config.IP_MNEMONIC && ip_mnemonic(ip);

	var s = common.safe;
	header.push(s(' <a class="mod addr">'),
			mnemonic, s('</a>'));
}

function denote_hidden(info) {
	if (info.data.hide)
		info.header.push(common.safe(
				' <em class="mod hidden">(hidden)</em>'));
}

function is_IPv4_ip(ip) {
	if (typeof ip != 'string' || !/^\d+\.\d+\.\d+\.\d+$/.exec(ip))
		return false;
	var nums = ip.split('.');
	for (var i = 0; i < 4; i++) {
		var n = parseInt(nums[i], 10);
		if (n > 255)
			return false;
		if (n && nums[i][0] == '0')
			return false;
	}
	return true;
}

var is_valid_ip = function (ip) {
	return typeof ip == 'string' && /^[\da-fA-F.:]{3,45}$/.test(ip);
}

function explode_IPv6_ip(ip) {
	if (typeof ip != 'string')
		return null;

	var groups = ip.split(':');
	var gap = groups.indexOf('');
	if (gap >= 0 || groups.length != 8) {
		// expand ::
		if (gap < 0 || gap != groups.lastIndexOf(''))
			return null;
		var zeroes = [gap, 1];
		for (var i = groups.length; i < 9; i++)
			zeroes.push('0');
		groups.splice.apply(groups, zeroes);
	}

	// check hex components
	for (var i = 0; i < groups.length; i++) {
		var n = parseInt(groups[i], 16);
		if (_.isNaN(n) || n > 0xffff)
			return null;
		groups[i] = n.toString(16);
	}

	return groups;
}

function ip_key(ip) {
	if (!is_IPv4_ip(ip)) {
		// chop off the last half of IPv6 ips
		var bits = explode_IPv6_ip(ip);
		if (bits && bits.length == 8)
			return bits.slice(0, 4).join(':');
	}
	return ip;
}

if (typeof IDENT != 'undefined') {
	/* client */
	window.ip_mnemonic = ip_mnemonic;
	if (IDENT.auth == 'Admin') {
		oneeSama.hook('headerName', append_mnemonic);
	}
	if (IDENT.auth == 'Moderator') {
		oneeSama.hook('headerName', append_mnemonic_no_ip);
	}
	oneeSama.hook('headerName', denote_hidden);
}
else if (isNode) {
	exports.ip_mnemonic = ip_mnemonic;
	exports.append_mnemonic = append_mnemonic;
	exports.append_mnemonic_no_ip = append_mnemonic_no_ip;
}

if (isNode){
	exports.modCache = modCache;
	exports.suspensionKeys = suspensionKeys;
	exports.delayDurations = delayDurations;
	exports.denote_hidden = denote_hidden;
	exports.is_IPv4_ip = is_IPv4_ip;
	exports.is_valid_ip = is_valid_ip;
	exports.ip_key = ip_key;
}
