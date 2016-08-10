var _ = require('underscore'),
    config = require('../config'),
    crypto = require('crypto'),
    express = require('express'),
    passport = require('passport'),
    querystring = require('querystring'),
    RES = require('./state').resources,
    request = require('request'),
    winston = require('winston'),
    OpenIDStrategy = require('passport-openid').Strategy;

function connect() {
	return global.redis;
}

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});
passport.use(new OpenIDStrategy({
        providerURL: 'http://steamcommunity.com/openid',
        stateless: true,
        returnURL: `${config.STEAM_AUDIENCE}/auth/openid/return`,
        realm: config.STEAM_AUDIENCE,
        profile: false
    },
    function(identifier, done) {
    	var id = identifier.match(/\d+$/)[0];
    	var admin = config.ADMIN_STEAMS.indexOf(id) >= 0;
    	var mod = config.MODERATOR_STEAMS.indexOf(id) >= 0;
    	if (!(admin || mod)) {
    		winston.error("Login attempt by " + id);
    		return respond_error(resp, 'Bad Steam.');
    	}
		var auth = (admin ? 'Admin' : (mod ? 'Moderator': null));
		var user = {id,auth};
    	return done(null,user);
    }));

exports.passport = passport;

function set_cookie (resp, info) {
    var pass = random_str();
    info.csrf = random_str();

    var m = connect().multi();
    m.hmset('session:'+pass, info);
    m.expire('session:'+pass, config.LOGIN_SESSION_TIME);
    m.exec(function (err) {
        if (err)
        // Samu plz, this would crash the server
            return;//oauth_error(resp, err);
        respond_ok(resp, make_cookie('a', pass, info.expires));
        resp.redirect('/');
    });
}
exports.set_cookie = set_cookie;

function extract_login_cookie(chunks) {
    if (!chunks || !chunks.a)
        return false;
    return /^[a-zA-Z0-9+\/]{20}$/.test(chunks.a) ? chunks.a : false;
}
exports.extract_login_cookie = extract_login_cookie;

function check_cookie (cookie, callback) {
    var r = connect();
    r.hgetall('session:' + cookie, function (err, session) {
        if (err)
            return callback(err);
        else if (_.isEmpty(session))
            return callback('Not logged in.');
        callback(null, session);
    });
}
exports.check_cookie = check_cookie;

function logout (req, resp) {
    var r = connect();
    var cookie = extract_login_cookie(req.cookies);
    if (!cookie)
        return respond_error(resp, "No login cookie for logout.");
    r.hgetall('session:' + cookie, function (err, session) {
        if (err){
            winston.debug(err);
            return respond_error(resp, "Logout error.");
        }
        r.del('session:' + req.cookies.a);
        respond_ok_send(resp, 'a=; expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });
}
exports.logout = logout;

function respond_error(resp, message) {
    resp.writeHead(200, {'Content-Type': 'application/json'});
    resp.end(JSON.stringify({status: 'error', message: message}));
}

function respond_ok(resp, cookie) {
    resp.set({
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
        'Location':'/'
    });
    resp.status('okay');
}

function respond_ok_send(resp, cookie) {
    resp.set({
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
        'Location':'/'
    });
    resp.json({status: 'okay'});
}

function make_expiry() {
    const expiry = new Date(Date.now() + config.LOGIN_SESSION_TIME * 1000)
        .toUTCString();
    /* Change it to the expected dash-separated format */
    const m = expiry.match(/^(\w+,\s+\d+)\s+(\w+)\s+(\d+\s+[\d:]+\s+\w+)$/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : expiry;
}

function make_cookie(key, val) {
    return `${key}=${val}; Path=${'/'}; Expires=${make_expiry()}`;
}

function random_str() {
    return crypto.randomBytes(15).toString('base64');
}