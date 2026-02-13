/* YOUTUBE */
var danbooru_re = /(?:>>>*?)?(?:https?:\/\/)?(?:www\.)?danbooru\.donmai\.us\/posts\/?\?(?:utf8=%E2%9C%93&)?tags=(.*)/;
var yt_re = /(?:https?:\/\/)?(?:www\.|m\.)?youtu\.?be(?:\.com\/watch\?v=|\/)([\w-]{11})(?:.*t=(\d+(?:h)?(?:\d+)?(?:m)?(?:\d+)?(?:s)?))?/;
var yt_time_re = /(?:(\d+h)?(\d+m)?(\d+s)?)?(\d+)?/;

function make_video(id, params, start) {
	if (!params)
		params = {allowFullScreen: 'true'};
	params.allowScriptAccess = 'always';
	var query = {
		autohide: 1,
		fs: 1,
		modestbranding: 1,
		origin: document.location.origin,
		rel: 0,
		showinfo: 0,
	};
	if (start)
		query.start = start;
	if (params.autoplay)
		query.autoplay = params.autoplay;
	if (params.loop) {
		query.loop = '1';
		query.playlist = id;
	}

	var uri = encodeURI('https://www.youtube.com/embed/' + id) + '?' +
			$.param(query);
	return $('<iframe></iframe>', {
		type: 'text/html', src: uri,
		frameborder: '0',
		attr: video_dims(),
		"class": 'youtube-player',
	});
}

function video_dims() {
	if (window.screen && screen.width < 560)
		return {width: 320, height: 240};
	else
		return {width: 560, height: 340};
}

$(document).on('click', '.watch', function (e) {
	if (e.which > 1 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey)
		return;
	var $target = $(e.target);

	/* maybe squash that double-play bug? ugh, really */
	if (!$target.is('a'))
		return;

	var $video = $target.find('iframe');
	if ($video.length) {
		$video.siblings('br').andSelf().remove();
		$target.css('width', 'auto');
		return false;
	}
	if ($target.data('noembed'))
		return;
    var m = $target.attr('href').match(yt_re);
    if (!m)
		return;
    timeCall(m[1],m[2],yt_time_re);
    function timeCall(url, time, timeRex){
        var start = 0;
        if (time){
            var t = time.match(timeRex);
			for (var i = 1; i < 4; i++) {
				if (t[i])
					start += parseInt(t[i], 10) * Math.pow(60,(3 - i));
			}
			if (start == 0)
				start = parseInt(t[4],10);
        }
        var $obj = make_video(url, null, start);
        with_dom(function () {
		$target.css('width', video_dims().width).append('<br>', $obj);
		});
    }
    return false;
});

$(document).on('mouseenter', '.watch', function (event) {
	var $target = $(event.target);
	if ($target.data('requestedTitle'))
		return;
	$target.data('requestedTitle', true);
	/* Edit textNode in place so that we don't mess with the embed */
	var node = $target.contents().filter(function () {
		return this.nodeType === 3;
	})[0];
	if (!node)
		return;
	var orig = node.textContent;
	with_dom(function () {
		node.textContent = orig + '...';
	});
	var m = $target.attr('href').match(yt_re);
	if (!m)
		return;
	$.ajax({
		url: 'https://www.googleapis.com/youtube/v3/videos',
		data: {id: m[1], key: hotConfig.YOUTUBE_APIKEY, part: 'snippet,status', fields: 'items(snippet(title),status(embeddable))'},
		dataType: 'json',
		success: function (data) {
			with_dom(gotInfo.bind(null, data));
		},
		error: function () {
			with_dom(function () {
				node.textContent = orig + '???';
			});
		},
	});
        //Creates the Titles upon hover
        //Note: Condense gotInfos into single function
	function gotInfo(data) {
		var title = data && data.items && data.items[0].snippet && data.items[0].snippet.title;
		if (title) {
			node.textContent = orig + ': ' + title;
			$target.css({color: 'black'});
		}
		else
			node.textContent = orig + ' (gone?)';

			if (data && data.items && data.items[0].status &&
				data.items[0].status.embeddable == false) {
			node.textContent += ' (EMBEDDING DISABLED)';
			$target.data('noembed', true);
		}
	}
});

/* SOUNDCLOUD */

var soundcloud_url_re = /(?:>>>*?)?(?:https?:\/\/)?(?:www\.)?soundcloud\.com\/([\w-]{1,40}\/[\w-]{1,80})\/?/;

function make_soundcloud(path, dims) {
	var query = {
		url: 'http://soundcloud.com/' + path,
		color: 'ffaa66',
		auto_play: false,
		show_user: false,
		show_comments: false,
	};
	var uri = 'https://w.soundcloud.com/player/?' + $.param(query);
	return $('<iframe></iframe>', {
		src: uri, width: dims.width, height: dims.height,
		scrolling: 'no', frameborder: 'no',
	});
}

$(document).on('click', '.soundcloud', function (e) {
	if (e.which > 1 || e.ctrlKey || e.altKey || e.shiftKey || e.metaKey)
		return;
	var $target = $(e.target);

	var $obj = $target.find('iframe');
	if ($obj.length) {
		$obj.siblings('br').andSelf().remove();
		$target.css('width', 'auto');
		return false;
	}
	var m = $target.attr('href').match(soundcloud_url_re);
	if (!m) {
		/* Shouldn't happen, but degrade to normal click action */
		return;
	}
	var width = Math.round($(window).innerWidth() * 0.75);
	var $obj = make_soundcloud(m[1], {width: width, height: 166});
	with_dom(function () {
		$target.css('width', width).append('<br>', $obj);
	});
	return false;
});

/* lol copy pasta */
$(document).on('mouseenter', '.soundcloud', function (event) {
	var $target = $(event.target);
	if ($target.data('requestedTitle'))
		return;
	$target.data('requestedTitle', true);
	/* Edit textNode in place so that we don't mess with the embed */
	var node = $target.contents().filter(function () {
		return this.nodeType === 3;
	})[0];
	if (!node)
		return;
	var orig = node.textContent;
	with_dom(function () {
		node.textContent = orig + '...';
	});
	var m = $target.attr('href').match(soundcloud_url_re);
	if (!m)
		return;

	$.ajax({
		url: '//soundcloud.com/oembed',
		data: {format: 'json', url: 'http://soundcloud.com/' + m[1]},
		dataType: 'json',
		success: function (data) {
			with_dom(gotInfo.bind(null, data));
		},
		error: function () {
			with_dom(function () {
				node.textContent = orig + '???';
			});
		},
	});

	function gotInfo(data) {
		var title = data && data.title;
		if (title) {
			node.textContent = orig + ': ' + title;
			$target.css({color: 'black'});
		}
		else
			node.textContent = orig + ' (gone?)';
	}
});

/* TWITTER / X */
var tweet_re = /(?:>>>*?)?(?:https?:\/\/)?(?:www\.)?(?:x|twitter|fxtwitter|vxtwitter|fixupx|fixvx|cunnyx|hitlerx)\.com\/([\w]{1,15})\/status\/(\d+)/;

function make_tweet(data) {
	var tweet = data.tweet;
	var $div = $('<div class="tweet-embed"></div>');

	// Author row
	var $author = $('<div class="tweet-author"></div>');
	var $avatar = $('<img>', {
		src: tweet.author.avatar_url,
		'class': 'tweet-avatar',
		alt: '',
	});
	var $names = $('<div class="tweet-names"></div>');
	$names.append(
		$('<span class="tweet-displayname"></span>').text(tweet.author.name),
		' ',
		$('<span class="tweet-handle"></span>').text('@' + tweet.author.screen_name)
	);
	$author.append($avatar, $names);
	$div.append($author);

	// Translate button
	var $translateBtn = $('<a class="tweet-translate-btn">Translate</a>');
	var tweetId = tweet.id;
	$translateBtn.on('click', function (e) {
		e.stopPropagation();
		e.preventDefault();
		var $btn = $(this);
		if ($div.find('.tweet-translated').length) {
			$div.find('.tweet-translated').remove();
			$btn.text('Translate');
			return;
		}
		$btn.text('Translating...');
		$.ajax({
			url: 'https://api.fxtwitter.com/status/' + tweetId + '/en',
			dataType: 'json',
			success: function (tData) {
				var tTweet = tData.tweet;
				if (tTweet && tTweet.text) {
					var $translated = $('<div class="tweet-translated"></div>');
					$translated.append(
						$('<div class="tweet-translated-label"></div>').text('Translated to English'),
						$('<div class="tweet-translated-text"></div>').text(tTweet.text)
					);
					$div.find('.tweet-text').before($translated);
					$btn.text('Hide Translation');
				}
				else {
					$btn.text('Translate');
				}
			},
			error: function () {
				$btn.text('Translate');
			},
		});
	});
	$div.append($translateBtn);

	// Tweet text
	$div.append($('<div class="tweet-text"></div>').text(tweet.text));

	// Media
	if (tweet.media && tweet.media.photos && tweet.media.photos.length) {
		var $media = $('<div class="tweet-media"></div>');
		for (var i = 0; i < tweet.media.photos.length; i++) {
			$media.append($('<img>', {src: tweet.media.photos[i].url}));
		}
		$div.append($media);
	}

	// Timestamp and engagement
	var date = tweet.created_at ? new Date(tweet.created_timestamp * 1000) : null;
	var timeStr = date ? date.toLocaleString() : '';
	var $meta = $('<div class="tweet-meta"></div>');
	var parts = [];
	if (timeStr)
		parts.push(timeStr);
	if (tweet.likes != null)
		parts.push(tweet.likes + ' likes');
	if (tweet.retweets != null)
		parts.push(tweet.retweets + ' retweets');
	if (tweet.replies != null)
		parts.push(tweet.replies + ' replies');
	$meta.text(parts.join(' \u00B7 '));
	$div.append($meta);

	return $div;
}

$(document).on('click', '.tweet', function (e) {
	if (e.which > 1 || e.ctrlKey || e.altKey || e.shiftKey || e.metaKey)
		return;
	var $target = $(e.target);

	if (!$target.is('a'))
		return;

	var $embed = $target.find('.tweet-embed');
	if ($embed.length) {
		$embed.siblings('br').andSelf().remove();
		$target.css('width', 'auto');
		return false;
	}

	var href = $target.attr('href');
	var m = href.match(/x\.com\/\w+\/status\/(\d+)/) || href.match(/x\.com\/i\/status\/(\d+)/);
	if (!m)
		return;
	var id = m[1];

	$.ajax({
		url: 'https://api.fxtwitter.com/status/' + id,
		dataType: 'json',
		success: function (data) {
			if (!data || !data.tweet) return;
			var $div = make_tweet(data);
			var width = Math.min(550, Math.round($(window).innerWidth() * 0.75));
			with_dom(function () {
				$target.css('width', width).append('<br>', $div);
			});
		},
		error: function () {
			with_dom(function () {
				var $err = $('<div class="tweet-embed">Failed to load tweet.</div>');
				$target.append('<br>', $err);
			});
		},
	});
	return false;
});

$(document).on('mouseenter', '.tweet', function (event) {
	var $target = $(event.target);
	if ($target.data('requestedTitle'))
		return;
	$target.data('requestedTitle', true);
	var node = $target.contents().filter(function () {
		return this.nodeType === 3;
	})[0];
	if (!node)
		return;
	var orig = node.textContent;
	with_dom(function () {
		node.textContent = orig + '...';
	});

	var href = $target.attr('href');
	var m = href.match(/x\.com\/\w+\/status\/(\d+)/) || href.match(/x\.com\/i\/status\/(\d+)/);
	if (!m)
		return;

	$.ajax({
		url: 'https://api.fxtwitter.com/status/' + m[1],
		dataType: 'json',
		success: function (data) {
			with_dom(function () {
				var tweet = data && data.tweet;
				if (tweet && tweet.author && tweet.text) {
					var preview = tweet.text.length > 80 ? tweet.text.slice(0, 80) + '...' : tweet.text;
					node.textContent = orig + ': ' + tweet.author.name + ' - ' + preview;
					$target.css({color: 'black'});
				}
				else
					node.textContent = orig + ' (gone?)';
			});
		},
		error: function () {
			with_dom(function () {
				node.textContent = orig + '???';
			});
		},
	});
});

// PASTEBIN
var pastebin_re = /(?:>>>*?)?(?:https?:\/\/)?(?:www\.|m.)?pastebin\.com\/(raw\/)?(.*)/;
//Pastebin's API seems built for MAKING pastebins but not sharing them.

$(document).on('click', '.pastebin', function(event){
    if (event.which > 1 || event.ctrlKey || event.altKey || event.shiftKey || event.metaKey)
		return;
	var $target = $(event.target);

	var $obj = $target.find('iframe');
	if ($obj.length) {
		$obj.siblings('br').andSelf().remove();
		$target.css('width', 'auto');
		return false;
	}

    var m = $target.attr('href').match(pastebin_re);
    if (!m)
        return;
    var width = Math.round($(window).innerWidth() * 0.65);
    var uri = 'https://pastebin.com/embed_iframe.php?i='+ m[2];
    var $obj = $('<iframe></iframe>', {
		type: 'text/html',
                src: uri,
		frameborder: '0',
                width: width
                });


    with_dom(function () {
		$target.css('width', width).append('<br>', $obj);
        });
    return false;
});
