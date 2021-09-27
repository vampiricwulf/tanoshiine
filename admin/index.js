var authcommon = require('./common'),
    caps = require('../server/caps'),
		config = require('../config'),
    common= require('../common'),
    okyaku = require('../server/okyaku'),
		report = require('../report/server'),
    STATE = require('../server/state');

require('./panel');

function connect() {
	return global.redis;
}

function calculateSelfbantime(stage) {
	return config.SELFBANTIME[stage] || calculateSelfbantime(stage-1)*2; // In case not enough stages are configured, it just doubles the previous one
}

function ban_self(ip){
	var type = 'timeout';
	if (!authcommon.is_valid_ip(ip))
		return false;
	var key = authcommon.ip_key(ip);
	var client = {ident: {ip}};

	var m = connect().multi();
	var stageKey = 'russian:lvl:'+ip;
	m.get(stageKey);
	m.pttl(stageKey); 
	m.exec(function (err,rs) {
		if (err) return false;

		var stage = rs[0];
		var TTL = rs[1];

		if(stage) {
			stage = Number(stage);
			var supposedDecay = config.RUSSIANDECAY * stage;
			var decayAmount = supposedDecay - TTL;
			var decayStages = Math.floor(decayAmount / config.RUSSIANDECAY);
			stage = Math.max(0, (stage - decayStages)) // Just making sure if the config got changed inbetween, so we don't go negative.
		} else {
			stage = 0;
			TTL = 0;
		}
		stage++;
		var sentence = calculateSelfbantime(stage);
	
		var m = connect().multi();
		if(!ban(m, client, ip, key, type, sentence))
			return false;

		m.set(stageKey, stage, 'px', TTL+config.RUSSIANDECAY);
		m.exec(function (err,rs) {
		})
		return true;
	});
}
exports.ban_self = ban_self;

function ban(m, mod, ip, key, type, sentence) {
	if (type == 'unban') {
		// unban from every type of suspension
		authcommon.suspensionKeys.forEach(function (suffix) {
			m.srem('hot:' + suffix, key);
		});
		m.hdel('ip:' + key, 'ban', 'sentence');
	}
	else {
		// need to validate that this is a valid ban type
		// TODO: elaborate
		if (type != 'timeout')
			return false;
			
		var till = (sentence == 'perma') ? sentence : new Date().getTime() + sentence;
		m.sadd('hot:' + type + 's', key);
		m.hmset('ip:' + key, 'ban', type, 'sentence', till);
	}
	var now = Date.now();
	var info = {ip: key, type: type, time: now, 'sentence': till};
	if (key !== ip)
		info.realip = ip;
	if (mod.ident.email)
		info.email = mod.ident.email;
	m.rpush('auditLog', JSON.stringify(info));
	report.send_modlog(mod.ident, "Ban/Unban", {ip, duration: sentence});
	
	// trigger reload
	m.publish('reloadBans', 'caps');

	return true;
}

okyaku.dispatcher[authcommon.BAN] = function (msg, client) {
	if (!caps.can_administrate(client.ident))
		return false;
	var ip = msg[0];
	var type = msg[1];
	var sentence = msg[2];
	if (!authcommon.is_valid_ip(ip))
		return false;
	var key = authcommon.ip_key(ip);

	var m = connect().multi();
	if (!ban(m, client, ip, key, type, sentence))
		return false;

	m.exec(function (err) {
		if (err)
			return client.kotowaru(err);
		var wasBanned = type != 'unban';

		/* XXX not DRY */
		var ADDRS = authcommon.modCache.addresses;
		if (ADDRS[key])
			ADDRS[key].ban = wasBanned;

		var a = {ban: wasBanned};
		client.send([0, common.MODEL_SET, ['addrs', key], a]);
	});
	return true;
};

var lift_expired_bans;
(function lift_expired_bans(){
	var r = global.redis;
	var again = setTimeout(lift_expired_bans, 60000);
	// Get banned IP hashes
	r.smembers('hot:timeouts', function(err, banned){
		if (err || !banned)
			return again;
		if (banned.length == 0)
			return again;
		var m = r.multi();
		for (i = 0; i < banned.length; i++){
			m.hgetall('ip:' + banned[i]);
		}
		m.exec(function(err, res){
			// Read and check, if ban has expired
			var m = r.multi();
			var must_reload;
			var now = new Date().getTime();
			var ADDRS = authcommon.modCache.addresses;
			for (i = 0; i < banned.length; i++){
				if (!res[i].sentence || res[i].sentence == 'perma')
					continue;
				if (res[i].sentence < now){
					must_reload = true;
					m.srem('hot:timeouts', banned[i]);
					m.hdel('ip:' + banned[i], 'ban', 'sentence');
					if (ADDRS[banned[i]])
						ADDRS[banned[i]].ban = false;
				}
			}
			if (must_reload){
				m.publish('reloadBans', 'caps');
				m.exec();
			}
			return again;
		});
	});
})();
