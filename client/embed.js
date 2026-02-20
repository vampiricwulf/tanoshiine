/* YOUTUBE */
var danbooru_re = /(?:>>>*?)?(?:https?:\/\/)?(?:www\.)?danbooru\.donmai\.us\/posts\/?\?(?:utf8=%E2%9C%93&)?tags=(.*)/;
var yt_re = /(?:https?:\/\/)?(?:www\.|m\.)?youtu\.?be(?:\.com\/watch\?v=|\/)([\w-]{11})(?:[^\s"<>]*?t=(\d+(?:h)?(?:\d+)?(?:m)?(?:\d+)?(?:s)?))?[^\s"<>]*/;
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

var soundcloud_url_re = /(?:>>>*?)?(?:https?:\/\/)?(?:www\.)?soundcloud\.com\/([\w-]{1,40}\/[\w-]{1,80})\/?[^\s"<>]*/;

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
var tweet_re = /(?:>>>*?)?(?:https?:\/\/)?(?:www\.)?(?:x|twitter|fxtwitter|vxtwitter|fixupx|fixvx|cunnyx|hitlerx)\.com\/([\w]{1,15})\/status\/(\d+)[^\s"<>]*/;

/* BLUESKY */
var bsky_re = /(?:>>>*?)?(?:https?:\/\/)?(?:www\.)?bsky\.app\/profile\/([\w.:%-]+)\/post\/([\w]+)[^\s"<>]*/;

function make_tweet_content(tweet) {
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
		if ($div.find('> .tweet-translated').length) {
			$div.find('> .tweet-translated').remove();
			$btn.text('Translate');
			return;
		}
		$btn.text('Translating...');
		$.ajax({
			url: 'https://api.fxtwitter.com/status/' + tweetId + '/en',
			dataType: 'json',
			success: function (tData) {
				var tl = tData.tweet && tData.tweet.translation;
				if (tl && tl.text) {
					var label = 'Translated from ' + (tl.source_lang_en || tl.source_lang || 'unknown');
					var $translated = $('<div class="tweet-translated"></div>');
					$translated.append(
						$('<div class="tweet-translated-label"></div>').text(label),
						$('<div class="tweet-translated-text"></div>').text(tl.text)
					);
					$div.find('> .tweet-text').before($translated);
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

	// Media — Twitter CDN blocks video hotlinking, use fxtwitter proxy where possible
	if (tweet.media) {
		var $media = $('<div class="tweet-media"></div>');
		var mediaProxy = 'https://d.fxtwitter.com/i/status/' + tweet.id;
		if (tweet.media.photos) {
			for (var i = 0; i < tweet.media.photos.length; i++) {
				$media.append($('<img>', {src: tweet.media.photos[i].url}));
			}
		}
		if (tweet.media.videos) {
			for (var i = 0; i < tweet.media.videos.length; i++) {
				var vid = tweet.media.videos[i];
				if (vid.type === 'gif') {
					// fxtwitter proxies GIFs through gif.fxtwitter.com
					$media.append($('<img>', {src: mediaProxy + '.mp4'}));
				}
				else {
					// Real videos can't be proxied — show thumbnail linking to tweet
					var $vidLink = $('<a>', {
						href: 'https://x.com/i/status/' + tweet.id,
						target: '_blank',
						rel: 'nofollow',
						'class': 'tweet-video-link',
					});
					$vidLink.on('click', function (e) { e.stopPropagation(); });
					var $thumb = $('<img>', {src: vid.thumbnail_url});
					var $play = $('<span class="tweet-play-btn">\u25B6</span>');
					$vidLink.append($thumb, $play);
					$media.append($vidLink);
				}
			}
		}
		if ($media.children().length)
			$div.append($media);
	}

	// Quoted tweet
	if (tweet.quote) {
		$div.append(make_tweet_content(tweet.quote));
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

function make_tweet(data) {
	return make_tweet_content(data.tweet);
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

/* BLUESKY EMBED */

var BSKY_API = 'https://public.api.bsky.app/xrpc/';

function render_bsky_images($media, images) {
	for (var i = 0; i < images.length; i++) {
		$media.append($('<img>', {src: images[i].fullsize, alt: images[i].alt || ''}));
	}
}

function render_bsky_video($media, embed, handle, rkey) {
	var $vidLink = $('<a>', {
		href: 'https://bsky.app/profile/' + handle + '/post/' + rkey,
		target: '_blank',
		rel: 'nofollow',
		'class': 'bsky-video-link',
	});
	$vidLink.on('click', function (e) { e.stopPropagation(); });
	var $thumb = $('<img>', {src: embed.thumbnail});
	var $play = $('<span class="bsky-play-btn">\u25B6</span>');
	$vidLink.append($thumb, $play);
	$media.append($vidLink);
}

function render_bsky_quote($div, record) {
	var $quote = $('<div class="bsky-embed"></div>');
	var author = record.author || {};
	var $qAuthor = $('<div class="bsky-author"></div>');
	if (author.avatar) {
		$qAuthor.append($('<img>', {src: author.avatar, 'class': 'bsky-avatar', alt: ''}));
	}
	var $qNames = $('<div class="bsky-names"></div>');
	$qNames.append(
		$('<span class="bsky-displayname"></span>').text(author.displayName || ''),
		' ',
		$('<span class="bsky-handle"></span>').text('@' + (author.handle || ''))
	);
	$qAuthor.append($qNames);
	$quote.append($qAuthor);

	var value = record.value || {};
	if (value.text) {
		$quote.append($('<div class="bsky-text"></div>').text(value.text));
	}

	// Quote may have its own images via record.embeds[]
	if (record.embeds) {
		var $qMedia = $('<div class="bsky-media"></div>');
		for (var i = 0; i < record.embeds.length; i++) {
			var qEmbed = record.embeds[i];
			if (qEmbed.$type === 'app.bsky.embed.images#view' && qEmbed.images) {
				render_bsky_images($qMedia, qEmbed.images);
			}
		}
		if ($qMedia.children().length)
			$quote.append($qMedia);
	}

	$div.append($quote);
}

function make_bsky_content(post) {
	var $div = $('<div class="bsky-embed"></div>');
	var author = post.author || {};

	// Author row
	var $author = $('<div class="bsky-author"></div>');
	if (author.avatar) {
		$author.append($('<img>', {src: author.avatar, 'class': 'bsky-avatar', alt: ''}));
	}
	var $names = $('<div class="bsky-names"></div>');
	$names.append(
		$('<span class="bsky-displayname"></span>').text(author.displayName || ''),
		' ',
		$('<span class="bsky-handle"></span>').text('@' + (author.handle || ''))
	);
	$author.append($names);
	$div.append($author);

	// Post text
	var record = post.record || {};
	if (record.text) {
		$div.append($('<div class="bsky-text"></div>').text(record.text));
	}

	// Media
	var embed = post.embed;
	if (embed) {
		var handle = author.handle || '';
		// Extract rkey from post URI (at://did/app.bsky.feed.post/rkey)
		var rkey = '';
		if (post.uri) {
			var uriParts = post.uri.split('/');
			rkey = uriParts[uriParts.length - 1];
		}

		var $media = $('<div class="bsky-media"></div>');
		var mediaEmbed = embed;
		var recordEmbed = null;

		if (embed.$type === 'app.bsky.embed.recordWithMedia#view') {
			mediaEmbed = embed.media;
			recordEmbed = embed.record;
		}
		else if (embed.$type === 'app.bsky.embed.record#view') {
			recordEmbed = embed;
			mediaEmbed = null;
		}

		if (mediaEmbed) {
			if (mediaEmbed.$type === 'app.bsky.embed.images#view' && mediaEmbed.images) {
				render_bsky_images($media, mediaEmbed.images);
			}
			else if (mediaEmbed.$type === 'app.bsky.embed.video#view') {
				render_bsky_video($media, mediaEmbed, handle, rkey);
			}
		}

		if ($media.children().length)
			$div.append($media);

		if (recordEmbed && recordEmbed.record) {
			render_bsky_quote($div, recordEmbed.record);
		}
	}

	// Timestamp and engagement
	var date = record.createdAt ? new Date(record.createdAt) : null;
	var timeStr = date ? date.toLocaleString() : '';
	var $meta = $('<div class="bsky-meta"></div>');
	var parts = [];
	if (timeStr)
		parts.push(timeStr);
	if (post.likeCount != null)
		parts.push(post.likeCount + ' likes');
	if (post.repostCount != null)
		parts.push(post.repostCount + ' reposts');
	if (post.replyCount != null)
		parts.push(post.replyCount + ' replies');
	$meta.text(parts.join(' \u00B7 '));
	$div.append($meta);

	return $div;
}

function resolve_bsky_did(handle) {
	// If it's already a DID, return it directly
	if (/^did:/.test(handle)) {
		return $.Deferred().resolve(handle).promise();
	}
	return $.ajax({
		url: BSKY_API + 'com.atproto.identity.resolveHandle',
		data: {handle: handle},
		dataType: 'json',
	}).then(function (data) {
		return data.did;
	});
}

$(document).on('click', '.bsky', function (e) {
	if (e.which > 1 || e.ctrlKey || e.altKey || e.shiftKey || e.metaKey)
		return;
	var $target = $(e.target);

	if (!$target.is('a'))
		return;

	var $embed = $target.find('.bsky-embed');
	if ($embed.length) {
		$embed.siblings('br').andSelf().remove();
		$target.css('width', 'auto');
		return false;
	}

	var href = $target.attr('href');
	var m = href.match(/bsky\.app\/profile\/([\w.:%-]+)\/post\/([\w]+)/);
	if (!m)
		return;
	var handle = m[1];
	var rkey = m[2];

	resolve_bsky_did(handle).then(function (did) {
		var uri = 'at://' + did + '/app.bsky.feed.post/' + rkey;
		return $.ajax({
			url: BSKY_API + 'app.bsky.feed.getPostThread',
			data: {uri: uri, depth: 0, parentHeight: 0},
			dataType: 'json',
		});
	}).then(function (data) {
		if (!data || !data.thread || !data.thread.post) return;
		var $div = make_bsky_content(data.thread.post);
		var width = Math.min(550, Math.round($(window).innerWidth() * 0.75));
		with_dom(function () {
			$target.css('width', width).append('<br>', $div);
		});
	}, function () {
		with_dom(function () {
			var $err = $('<div class="bsky-embed">Failed to load post.</div>');
			$target.append('<br>', $err);
		});
	});
	return false;
});

$(document).on('mouseenter', '.bsky', function (event) {
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
	var m = href.match(/bsky\.app\/profile\/([\w.:%-]+)\/post\/([\w]+)/);
	if (!m)
		return;
	var handle = m[1];
	var rkey = m[2];

	resolve_bsky_did(handle).then(function (did) {
		var uri = 'at://' + did + '/app.bsky.feed.post/' + rkey;
		return $.ajax({
			url: BSKY_API + 'app.bsky.feed.getPostThread',
			data: {uri: uri, depth: 0, parentHeight: 0},
			dataType: 'json',
		});
	}).then(function (data) {
		with_dom(function () {
			var post = data && data.thread && data.thread.post;
			if (post && post.author && post.record && post.record.text) {
				var text = post.record.text;
				var preview = text.length > 80 ? text.slice(0, 80) + '...' : text;
				var name = post.author.displayName || post.author.handle || '';
				node.textContent = orig + ': ' + name + ' - ' + preview;
				$target.css({color: 'black'});
			}
			else
				node.textContent = orig + ' (gone?)';
		});
	}, function () {
		with_dom(function () {
			node.textContent = orig + '???';
		});
	});
});

// PASTEBIN
var pastebin_re = /(?:>>>*?)?(?:https?:\/\/)?(?:www\.|m\.)?pastebin\.com\/(raw\/)?(\w+)[^\s"<>]*/;
//Pastebin's API seems built for MAKING pastebins but not sharing them.

$(document).on('click', '.pastebin', function(event){
    if (event.which > 1 || event.ctrlKey || event.altKey || event.shiftKey || event.metaKey)
		return;
	var $target = $(event.target);

	var $obj = $target.find('.pastebin-embed');
	if ($obj.length) {
		$obj.siblings('br').andSelf().remove();
		$target.css('width', 'auto');
		return false;
	}

    var m = $target.attr('href').match(pastebin_re);
    if (!m)
        return;
    var width = Math.round($(window).innerWidth() * 0.65);
    var uri = 'https://pastebin.com/raw/' + m[2];

    $.get(uri).done(function(data) {
        var lines = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
            .split('\n');
        var $table = $('<table/>').css({
            'border-collapse': 'collapse',
            'width': '100%',
            'font-family': 'monospace',
            'font-size': '13px',
            'line-height': '1.4'
        });
        for (var i = 0; i < lines.length; i++) {
            var bg = i % 2 === 0 ? 'rgba(255,255,255,0.03)'
                : 'rgba(255,255,255,0.07)';
            var $num = $('<td/>').text(i + 1).css({
                'color': '#888',
                'text-align': 'right',
                'padding': '1px 10px 1px 8px',
                'user-select': 'none',
                '-moz-user-select': 'none',
                '-webkit-user-select': 'none',
                'white-space': 'nowrap',
                'vertical-align': 'top',
                'border-right': '1px solid #555',
                'background': bg
            });
            var $code = $('<td/>').text(lines[i] || '\u00a0').css({
                'padding': '1px 10px',
                'white-space': 'pre-wrap',
                'word-wrap': 'break-word',
                'background': bg
            });
            $table.append($('<tr/>').append($num, $code));
        }
        var $copy = $('<button/>').text('Copy').css({
            'position': 'absolute',
            'top': '4px',
            'right': '4px',
            'background': '#555',
            'color': '#eee',
            'border': '1px solid #777',
            'border-radius': '3px',
            'padding': '2px 8px',
            'cursor': 'pointer',
            'font-size': '12px',
            'opacity': '0.7'
        }).hover(
            function(){ $(this).css('opacity', '1'); },
            function(){ $(this).css('opacity', '0.7'); }
        ).click(function(e) {
            e.stopPropagation();
            e.preventDefault();
            var text = data;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text);
            } else {
                var $ta = $('<textarea/>').val(text)
                    .css({'position':'fixed','left':'-9999px'})
                    .appendTo('body');
                $ta[0].select();
                document.execCommand('copy');
                $ta.remove();
            }
            $(this).text('Copied!');
            var btn = this;
            setTimeout(function(){ $(btn).text('Copy'); }, 1500);
        });
        var $wrap = $('<div/>').addClass('pastebin-embed').css({
            'position': 'relative',
            'max-height': '400px',
            'overflow': 'auto',
            'background': '#1e1e1e',
            'color': '#d4d4d4',
            'border': '1px solid #555',
            'border-radius': '3px'
        }).append($copy, $table);
        with_dom(function () {
            $target.css('width', width).append('<br>', $wrap);
        });
    }).fail(function() {
        window.open($target.attr('href'), '_blank');
    });
    return false;
});
