/* YOUTUBE */
var danbooru_re = /(?:>>>*?)?(?:https?:\/\/)?(?:www\.)?danbooru\.donmai\.us\/posts\/?\?(?:utf8=%E2%9C%93&)?tags=(.*)/;
var yt_re = /(?:https?:\/\/)?(?:www\.|m\.)?youtu\.?be(?:\.com\/watch\?v=|\/)([\w-]{11})(?:.*t=(\d+(?:h)?(?:\d+)?(?:m)?(?:\d+)?(?:s)?))?/;
var yt_time_re = /(?:(\d+h)?(\d+m)?(\d+s)?)?(\d+)?/;

function make_video(id, params, start) {
    if (!params)
        params = {
            allowFullScreen: 'true'
        };
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
        type: 'text/html',
        src: uri,
        frameborder: '0',
        attr: video_dims(),
        "class": 'youtube-player',
    });
}

function video_dims() {
    if (window.screen && screen.width < 560)
        return {
            width: 320,
            height: 240
        };
    else
        return {
            width: 560,
            height: 340
        };
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
    timeCall(m[1], m[2], yt_time_re);
    function timeCall(url, time, timeRex) {
        var start = 0;
        if (time) {
            var t = time.match(timeRex);
            for (var i = 1; i < 4; i++) {
                if (t[i])
                    start += parseInt(t[i], 10) * Math.pow(60, (3 - i));
            }
            if (start == 0)
                start = parseInt(t[4], 10);
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
        data: {
            id: m[1],
            key: hotConfig.YOUTUBE_APIKEY,
            part: 'snippet,status',
            fields: 'items(snippet(title),status(embeddable))'
        },
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
            $target.css({
                color: 'black'
            });
        } else
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
        src: uri,
        width: dims.width,
        height: dims.height,
        scrolling: 'no',
        frameborder: 'no',
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
    var $obj = make_soundcloud(m[1], {
        width: width,
        height: 166
    });
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
        data: {
            format: 'json',
            url: 'http://soundcloud.com/' + m[1]
        },
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
            $target.css({
                color: 'black'
            });
        } else
            node.textContent = orig + ' (gone?)';
    }
});

// PASTEBIN
var pastebin_re = /(?:>>>*?)?(?:https?:\/\/)?(?:www\.|m.)?pastebin\.com\/(raw\/)?(.*)/;
//Pastebin's API seems built for MAKING pastebins but not sharing them.

$(document).on('click', '.pastebin', function (event) {
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
    var uri = 'https://pastebin.com/embed_iframe.php?i=' + m[2];
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

// X
var x_re = /(?:https?:\/\/)?(?:www\.|g\.)?(?:(?:fx|vx)?twitt(?:e|p)r|(?:fix)?(?:up|v)?x)\.com\/(\w+)?\/?status\/(\d{19})(?:\S*)?/;

function get_x(author, id) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', `https://api.fxtwitter.com/${author}/status/${id}${(shouldTranslate) ? '/en' : ''}`);
    xhr.send(null);
    return JSON.parse(xhr.response);

}

$(document).on('click', '.x', function (event) {
    if (event.which > 1 || event.ctrlKey || event.altKey || event.shiftKey || event.metaKey)
        return;
    var $target = $(event.target);

    var $obj = $target.find('div');
    if ($obj.length) {
        $obj.siblings('br').andSelf().remove();
        return false;
    }

    var m = $target.attr('href').match(x_re);
    if (!m)
        return;

    var resp = get_x(m[1], m[2]).tweet;
    var $obj = $('<div />', {
        class: 'x-container'
    }).css({
		display: 'grid',
	});
    /* AUTHOR */
    var $author = $('<div />', { //subgrid
        class: 'x-author-container',
    }).css({
		display: 'grid',
		grid-column: '1fr 4fr',
		grid-row: '1fr',
	});
    var $authorinfo = $('<div />', { //subgrid
        class: 'x-author-info-container',
    }).css({
		display: 'grid',
		grid-column: '2 / 3',
		grid-row: '1 / 3',
		grid-template-columns: 'subgrid';
		grid-template-rows: 'subgrid';
	});
    $author.append($('<img />', {
            src: resp.author.avatar_url
        }));
    $authorinfo.append($(`<div>${resp.author.name}</div>`));
    $authorinfo.append($(`<div>@${resp.author.screen_name}</div>`));
    /* MEDIA */
    if (resp.media) { //subgrid move this into a content container
        var $media = $('<div />', {
            class: 'x-media-container'
        });
        for (let i = 0; i < resp.media.length; i++) {
            var item = resp.media[i];
            var typeMedia = item.type;
            $media.append($('<img \>', {
                    src: item.url
                }));
        }
    }
    /* CONTENT */
    var $content = $(`<div>${resp.text}</div>`, {
        class: 'x-content',
    });
    /* QUOTE */
    var $quote = $('<div />', { //subgrid containing 2 subgrids
        class: 'x-quote-container',
    });
    /* INFO */
    var $info = $('<div />', {
        class: 'x-info',
    });

    with_dom(function () {
        $target.append('<br>', $obj);
    });
    return false;
});
