var optSpecs = [];
var nashi = {opts: []}, inputMinSize = 300;
var shortcutKeys = {};
var volumeConfig = (imagerConfig.WEBM
	|| imagerConfig.AUDIOFILES
	|| options.get('beep'));
if (volumeConfig) {
	$("#volumeController").appendTo('body').hide();
	$("#volumeText").show();
	$("#volumeButton").show();
}

function extract_num(q) {
	return parseInt(q.attr('id'), 10);
}

function parent_post($el) {
	return $el.closest('article, section');
}

function parent_model($el) {
	var $a = parent_post($el);
	var op = extract_num($a);
	if (!op)
		return null;
	if ($a.is('section'))
		return Threads.get(op);
	var $s = $a.parent('section');
	if (!$s.length) {
		// when we have better hover/inline expansion we will have to
		// deal with this, probably by setting data-op on the post
		console.warn($a, "'s parent is not thread?!");
		return null;
	}
	var num = op;
	op = extract_num($s);
	return Threads.lookup(num, op);
}

(function () {

/* OPTIONS LIST */
optSpecs.push(option_topbanner);
optSpecs.push(option_linkify);
optSpecs.push(option_backlinks);
optSpecs.push(option_inline_expansion);
optSpecs.push(option_thumbs);
optSpecs.push(option_theme);
optSpecs.push(option_StreamSize);
optSpecs.push(option_reply_at_right);
optSpecs.push(option_beep);
optSpecs.push(option_notification);
optSpecs.push(option_sauce);
optSpecs.push(option_autogif);
optSpecs.push(option_spoiler);
optSpecs.push(option_image_hover);
optSpecs.push(option_webm_hover);
optSpecs.push(option_relative_time);
optSpecs.push(option_youcounter);
optSpecs.push(option_horizontal);
optSpecs.push(option_user_bg);
optSpecs.push(option_user_bg_image);
optSpecs.push(option_alwaysLock);
optSpecs.push(option_postUnloading);
optSpecs.push(option_last_n);
optSpecs.push(option_clean_ls);

nashi.upload = !!$('<input type="file"/>').prop('disabled');

if (window.screen && screen.width <= 320)
	inputMinSize = 50;

function load_ident() {
	try {
		var id = JSON.parse(localStorage.ident);
		if (id.name)
			$name.val(id.name);
		if (id.email)
			$email.val(id.email);
	}
	catch (e) {}
}

function save_ident() {
	try {
		var name = $name.val(), email = $email.val();
		if (is_sage(email) && !is_noko(email))
			email = false;
		var id = {};
		if (name || email) {
			if (name)
				id.name = name;
			if (email)
				id.email = email;
			localStorage.setItem('ident', JSON.stringify(id));
		}
		else
			localStorage.removeItem('ident');
	}
	catch (e) {}
}

options.on('change', function () {
	try {
		localStorage.options = JSON.stringify(options);
	}
	catch (e) {}
});

var tabs = {
	General: "General",
	Style: "Style",
	Help: "Help"
};

if (!isMobile)
	tabs.Shortcuts = "Shortcuts";

/* LAST N CONFIG */
function option_last_n(n) {
	if (!reasonable_last_n(n))
		return;
	$.cookie('lastn', n, {path: '/'});
	// should really load/hide posts as appropriate
}
option_last_n.id = 'lastn';
option_last_n.label = '[Last #]';
option_last_n.type = 'positive';
option_last_n.tooltip = 'Number of posts to display with the "Last n" thread expansion link';
option_last_n.tab = tabs.General;

oneeSama.lastN = options.get('lastn');
options.on('change:lastn', function (model, lastN) {
	oneeSama.lastN = lastN;
});

/* KEEP THREAD LENGTH WITHIN LASTN */

function option_postUnloading(){}

option_postUnloading.id = 'postUnloading';
option_postUnloading.label = 'Dynamic Post Unloading';
option_postUnloading.type = 'checkbox';
option_postUnloading.tooltip = 'Improves thread responsiveness by unloading posts from the'+
		' top of the thread, so that post count stays within the Last # value. Only applies to '+
		'Last # enabled threads';
option_postUnloading.tab = tabs.General;

/* LOCK TO BOTTOM EVEN WHEN DOCUMENT HIDDEN*/

function option_alwaysLock(){}

option_alwaysLock.id = 'alwaysLock';
option_alwaysLock.label = 'Always Lock to Bottom';
option_alwaysLock.type = 'checkbox';
option_alwaysLock.tooltip = 'Lock scrolling to page bottom even when tab is hidden';
option_alwaysLock.tab = tabs.General;

/* THEMES */

var themes = [
	'moe',
	'gar',
	'mawaru',
	'moon',
	'ashita',
	'spooki',
	'console',
	'terminal',
	'tea',
	'coffee',
	'higan',
	'best',
	'classic',
	'homu',
	'chihiro',
	'glass'
];

function option_theme(theme) {
	if (theme) {
		var css = hotConfig.css[theme + '.css'];
		$('#theme').attr('href', mediaURL + 'css/' + css);
	}
	append_glass();
}

option_theme.id = 'board.$BOARD.theme';
option_theme.label = 'Theme';
option_theme.type = themes;
option_theme.tooltip = 'Select CSS theme';
option_theme.tab = tabs.Style;

/* STREAM VIDEO PLAYER SIZE */

var StreamSizes = [
	'1/2 Window',
	'1/3 Window',
	'1/4 Window',
	'720p',
	'480p',
	'320p'
];


function option_StreamSize(size) {
        if (size) {
                var s = {
			'1/2 Window' : parseInt($(window).width()/2,10),
			'1/3 Window' : parseInt($(window).width()/3,10),
			'1/4 Window' : parseInt($(window).width()/4,10),
			'720p' : 720,
			'480p' : 480,
			'320p' : 320
		}
		if (size != '720p' || size != '480p' || size != '320p') {
                	$('#StreamPlayer video').width(s[size]);
		} else {
			$('#StreamPlayer video').height(s[size]);
		}
        }
}

option_StreamSize.id = 'streamsize';
option_StreamSize.label = 'Stream Video Size';
option_StreamSize.type = StreamSizes;
option_StreamSize.tooltip = "Select the stream's video size";
option_StreamSize.tab = tabs.Style;

/* THUMBNAIL OPTIONS */

function option_thumbs(type) {
	$.cookie('thumb', type);
	oneeSama.thumbStyle = type;
}

option_thumbs.id = 'thumbs';
option_thumbs.label = 'Thumbnails';
option_thumbs.type = thumbStyles;
option_thumbs.tooltip = 'Set thumbnail type: ' +
	'Small: 125x125, small file size; ' +
	'Sharp: 125x125, more detailed; ' +
	'Hide: hide all images;';
option_thumbs.tab = tabs.Style;

/* REPLY AT RIGHT */

function option_reply_at_right(r) {
	if (r)
		$('<style/>', {
			id: 'reply-at-right',
			text: 'aside { margin: -26px 0 2px auto; }',
		}).appendTo('head');
	else
		$('#reply-at-right').remove();
}
option_reply_at_right.id = 'replyright';
option_reply_at_right.label = '[Reply] at Right';
option_reply_at_right.type = 'checkbox';
option_reply_at_right.tooltip = 'Move Reply button to the right side of the page';
option_reply_at_right.tab = tabs.Style;

/* BACKLINKS */

function option_backlinks(b) {
	if (b)
		$('small').remove();
	else
		show_backlinks();
}
option_backlinks.id = 'nobacklinks';
option_backlinks.label = 'Backlinks';
option_backlinks.type = 'revcheckbox';
option_backlinks.tooltip = 'Links to replies of current post';
option_backlinks.tab = tabs.General;

function show_backlinks() {
	if (load_thread_backlinks) {
		with_dom(function () {
			$('section').each(function () {
				load_thread_backlinks($(this));
			});
		});
		load_thread_backlinks = null;
		return;
	}

	Threads.each(function (thread) {
		thread.get('replies').each(function (reply) {
			if (reply.has('backlinks'))
				reply.trigger('change:backlinks');
		});
	});
}

var load_thread_backlinks = function ($section) {
	var op = extract_num($section);
	var replies = Threads.get(op).get('replies');
	$section.find('blockquote a').each(function () {
		var $a = $(this);
		var m = $a.attr('href').match(/^\d*#(\d+)$/);
		if (!m)
			return;
		var destId = parseInt(m[1], 10);
		if (!replies.get(destId)) // local backlinks only for now
			return;
		var src = replies.get(extract_num(parent_post($a)));
		if (!src)
			return;
		var update = {};
		update[destId] = op;
		add_post_links(src, update, op);
	});
};

/* LINKIFY TEXT URLS */

function option_linkify(toggle){
	$.cookie('linkify', toggle, {path: '/'});
}

option_linkify.id = 'linkify';
option_linkify.label = 'Linkify URLs';
option_linkify.type = 'checkbox';
option_linkify.tooltip = 'Convert in-post text URLs to clickable links. WARNING: Potential security hazard (XSS). Requires page refresh.';
option_linkify.tab = tabs.General;

/* RELATIVE POST TIMESTAMPS */

function option_relative_time(toggle){
	$.cookie('rTime', toggle, {path: '/'});
}

option_relative_time.id = 'relativeTime';
option_relative_time.label = 'Relative Timestamps';
option_relative_time.type = 'checkbox';
option_relative_time.tooltip = 'Relative post timestamps. Ex.: "1 hour ago." Requires page refresh';
option_relative_time.tab = tabs.Style;


/* SAUCE TOGGLE */

function option_sauce(saucetoggle) {
	$.cookie('sauce',saucetoggle, {path: '/'});
	oneeSama.sauceToggle = saucetoggle;
}
option_sauce.id = 'nosaucetoggle';
option_sauce.label = 'Sauce Links';
option_sauce.type = 'checkbox';
option_sauce.tooltip = "Replace 'Image' with sauce links. Requires page refresh";
option_sauce.tab = tabs.General;


/* SPOILER TOGGLE */

function option_spoiler(spoilertoggle) {
	$.cookie('spoil',spoilertoggle, {path: '/'});
	oneeSama.spoilToggle = spoilertoggle;
}

option_spoiler.id = 'noSpoilers';
option_spoiler.label = 'Image Spoilers';
option_spoiler.type = 'revcheckbox';
option_spoiler.tooltip = "Don't spoiler images";
option_spoiler.tab = tabs.Style;


/* AUTOGIF TOGGLE */

function option_autogif(autogif) {
	$.cookie('agif',autogif, {path: '/'});
	oneeSama.autoGif = autogif;
}

option_autogif.id = 'autogif';
option_autogif.label = 'Animated GIF Thumbnails';
option_autogif.type = 'checkbox';
option_autogif.tooltip = 'Animate GIF thumbnails';
option_autogif.tab = tabs.Style;

/* TOP BANNER TOGGLE */

function option_topbanner(bannertoggle) {
	if ($(window).width() <= 640 && !bannertoggle) {
		$('.notification').remove();
		this.$el = $('<div/>', {
			'class': 'notification modal'
		})
			.html('<b><center>Your browser screen is too small<br>to fit the banner properly.<br>Click to remove.</center></b>')
			.css('top', 10 + 'px')
			.insertAfter($('body'))
			.attr('onclick', '$(this).remove();');
		$('#bannerTop').hide();
		return;
	}

	if (hotConfig.CUSTOM_BANNER_TOP)
		$('#bannerCenter').html('<b>' + hotConfig.CUSTOM_BANNER_TOP + '</b>');

	if(!bannertoggle) {
		$('#bannerTop').show();
		_.each(['#feedback', '#sync'], function(el){$(el).prependTo('#bannerRight');});
		_.each(['#identity', '#options', '#options-panel'], function(el){$(el).appendTo('#bannerRight');});
		if(!$("body").hasClass("top-banner"))
			$("body").addClass('top-banner');
		if (volumeConfig) {
			if($("body > #volumeController"))
				$("#volumeController").insertAfter('#FAQ');
			$("#volumeText").hide();
		}
 		$("#navTop").appendTo("#bannerLeft");
		$("#feedback").html('<svg xmlns="http://www.w3.org/2000/svg" width="17px" height="17px" viewBox="0 0 30 30"><path d="M28.516,7.167H3.482l12.517,7.108L28.516,7.167zM16.74,17.303C16.51,17.434,16.255,17.5,16,17.5s-0.51-0.066-0.741-0.197L2.5,10.06v14.773h27V10.06L16.74,17.303z" /></svg>');
 		$("#feedback").attr('title', 'Feedback');
		$("#identity").addClass("modal bmodal");
		$("#identity").hide();
		$("#options").html('<svg xmlns="http://www.w3.org/2000/svg" width="17px" height="17px" viewBox="0 0 30 30"><path d="M17.41,20.395l-0.778-2.723c0.228-0.2,0.442-0.414,0.644-0.643l2.721,0.778c0.287-0.418,0.534-0.862,0.755-1.323l-2.025-1.96c0.097-0.288,0.181-0.581,0.241-0.883l2.729-0.684c0.02-0.252,0.039-0.505,0.039-0.763s-0.02-0.51-0.039-0.762l-2.729-0.684c-0.061-0.302-0.145-0.595-0.241-0.883l2.026-1.96c-0.222-0.46-0.469-0.905-0.756-1.323l-2.721,0.777c-0.201-0.228-0.416-0.442-0.644-0.643l0.778-2.722c-0.418-0.286-0.863-0.534-1.324-0.755l-1.96,2.026c-0.287-0.097-0.581-0.18-0.883-0.241l-0.683-2.73c-0.253-0.019-0.505-0.039-0.763-0.039s-0.51,0.02-0.762,0.039l-0.684,2.73c-0.302,0.061-0.595,0.144-0.883,0.241l-1.96-2.026C7.048,3.463,6.604,3.71,6.186,3.997l0.778,2.722C6.736,6.919,6.521,7.134,6.321,7.361L3.599,6.583C3.312,7.001,3.065,7.446,2.844,7.907l2.026,1.96c-0.096,0.288-0.18,0.581-0.241,0.883l-2.73,0.684c-0.019,0.252-0.039,0.505-0.039,0.762s0.02,0.51,0.039,0.763l2.73,0.684c0.061,0.302,0.145,0.595,0.241,0.883l-2.026,1.96c0.221,0.46,0.468,0.905,0.755,1.323l2.722-0.778c0.2,0.229,0.415,0.442,0.643,0.643l-0.778,2.723c0.418,0.286,0.863,0.533,1.323,0.755l1.96-2.026c0.288,0.097,0.581,0.181,0.883,0.241l0.684,2.729c0.252,0.02,0.505,0.039,0.763,0.039s0.51-0.02,0.763-0.039l0.683-2.729c0.302-0.061,0.596-0.145,0.883-0.241l1.96,2.026C16.547,20.928,16.992,20.681,17.41,20.395zM11.798,15.594c-1.877,0-3.399-1.522-3.399-3.399s1.522-3.398,3.399-3.398s3.398,1.521,3.398,3.398S13.675,15.594,11.798,15.594zM27.29,22.699c0.019-0.547-0.06-1.104-0.23-1.654l1.244-1.773c-0.188-0.35-0.4-0.682-0.641-0.984l-2.122,0.445c-0.428-0.364-0.915-0.648-1.436-0.851l-0.611-2.079c-0.386-0.068-0.777-0.105-1.173-0.106l-0.974,1.936c-0.279,0.054-0.558,0.128-0.832,0.233c-0.257,0.098-0.497,0.22-0.727,0.353L17.782,17.4c-0.297,0.262-0.568,0.545-0.813,0.852l0.907,1.968c-0.259,0.495-0.437,1.028-0.519,1.585l-1.891,1.06c0.019,0.388,0.076,0.776,0.164,1.165l2.104,0.519c0.231,0.524,0.541,0.993,0.916,1.393l-0.352,2.138c0.32,0.23,0.66,0.428,1.013,0.6l1.715-1.32c0.536,0.141,1.097,0.195,1.662,0.15l1.452,1.607c0.2-0.057,0.399-0.118,0.596-0.193c0.175-0.066,0.34-0.144,0.505-0.223l0.037-2.165c0.455-0.339,0.843-0.747,1.152-1.206l2.161-0.134c0.152-0.359,0.279-0.732,0.368-1.115L27.29,22.699zM23.127,24.706c-1.201,0.458-2.545-0.144-3.004-1.345s0.143-2.546,1.344-3.005c1.201-0.458,2.547,0.144,3.006,1.345C24.931,22.902,24.328,24.247,23.127,24.706z"/></svg>');
		$("#options").attr('title', 'Options');
		$("h1").css("margin-top", 18 + $('#bannerTop').height() + "px");
		$("#sync").replaceWith($('<b id="sync">' + $("#sync").html() + '</b>'));
	} else {
		$('#bannerTop').hide();
		if($("body").hasClass("top-banner")) {
			$("#sync").insertAfter("body > h1");
			_.each(['#identity', '#volumeText', '#options'], function(el){$(el).insertAfter('#sync');});
			_.each(['#navTop', '#feedback'], function(el){$(el).prependTo('body');});
			_.each(['#options', '#feedback'], function(el){$(el).removeAttr('title');});
			$("#options").text('Options');
			$("#options-panel").appendTo("body");
			$("#feedback").text('Feedback');
			if (volumeConfig) {
				$("#volumeController").appendTo('body');
				$("#volumeText").show();
			}
			$("#identity").removeClass("modal bmodal");
			$("#identity").show();
			$("h1").css("margin-top", "18px");
			$("#sync").replaceWith($('<span id="sync">' + $("#sync").html() + '</span>'));
		}
	}
}
option_topbanner.id = 'notopbannertoggle';
option_topbanner.label = 'Top Banner';
option_topbanner.type = 'revcheckbox';
option_topbanner.tooltip = 'Toggle the banner at the top'
option_topbanner.tab = tabs.General;

/* BEEP */

function option_beep(){}
option_beep.id = 'beepbox';
option_beep.label = 'Beep';
option_beep.type = 'checkbox';
option_beep.tooltip = 'Beep when someone replies to your post';
option_beep.tab = tabs.Style;

/* NOTIFICATIONS */

function option_notification(notifToggle) {
	if(notifToggle && (Notification.permission !== "granted"))
		Notification.requestPermission();
}

option_notification.id = 'notification';
option_notification.label = 'Desktop Notifications';
option_notification.type = 'checkbox';
option_notification.tooltip = 'Get desktop notifications when quoted or a syncwatch is about to start';
option_notification.tab = tabs.Style;

/* HORIZONTAL POSTING */

function option_horizontal(toggle){
	var style = '<style id="horizontal">article,aside{display:inline-block;}</style>';
	if (toggle)
		$('head').append(style);
	else
		$('#horizontal').remove();
}

option_horizontal.id = 'horizontalPosting';
option_horizontal.label = 'Horizontal Posting';
option_horizontal.type = 'checkbox';
option_horizontal.tooltip = '38chan nostalgia';
option_horizontal.tab = tabs.Style;

/* YOU COUNTER */

function option_youcounter(toggle){
	if (toggle) {
		$('#Ycount').show();
		$('#Ycount').html((THREAD?"Thread ":"Front Page ") + "(You)s: " + yC[THREAD] + "<br>Total (You)s: " + yC.total);
	} else {
		$('#Ycount').hide();
	}
}

option_youcounter.id = 'youCounter';
option_youcounter.label = '(You) Counter';
option_youcounter.type = 'checkbox';
option_youcounter.tooltip = 'For shitposters (only counts if in thread).';
option_youcounter.tab = tabs.Style;

/* CUSTOM USER-SET BACKGROUND */

function option_user_bg(toggle){
	if (localStorage.userBG && toggle){
		var image = localStorage.userBG;
		$('body').append($('<img />', {
			id: 'user_bg',
			src: image
		}));
		// Append blurred BG, if theme is glass
		append_glass();
	}
	else {
		$('#user_bg').remove();
		$('#blurred').remove();
	}
}

option_user_bg.id = 'board.$BOARD.userBG';
option_user_bg.label = 'Custom Background';
option_user_bg.type = 'checkbox';
option_user_bg.tooltip = 'Toggle custom page background';
option_user_bg.tab = tabs.Style;


function option_user_bg_image(target){
	if (target){
		// Read image from disk
		var reader = new FileReader();
		reader.onload = function(event){
			var img = new Image();
			img.onload = function(){
				// Prevent memory leaks
				$(this).remove();
				localStorage.userBG = img.src;
				// Blur with Pixastic
				Pixastic.process(img, 'blurfast', {amount: 1.5}, function(blurred){
					localStorage.userBGBlurred = blurred.toDataURL('image/jpeg', 0.9);
					if (options.get(option_user_bg.id))
						option_user_bg(true);
				});
			};
			img.src = event.target.result;
		};
		reader.readAsDataURL(target.files[0]);
	}
}

function append_glass(){
	// Check if theme is glass, user-bg is set and blurred BG is generated
	if (options.get(option_theme.id) == 'glass' && options.get(option_user_bg.id) &&
		localStorage.userBG && localStorage.userBGBlurred){
			// Apply blurred background
			var blurred = localStorage.userBGBlurred;
			$('#blurred').remove();
			$('<style />', {id: 'blurred'})
				.appendTo('head')
				.html(
					'article, aside, .pagination, .popup-menu, .modal, .bmodal, .preview, #bannerTop {\
						background:\
							linear-gradient(rgba(40, 42, 46, 0.5), rgba(40, 42, 46, 0.5)),' +
							'url(' + blurred + ') center fixed no-repeat; background-size: cover;}' +
					'.editing{\
						background:\
							linear-gradient(rgba(145, 145, 145, 0.5), rgba(145, 145, 145, 0.5)),' +
							'url(' + blurred + ') center fixed no-repeat !important; background-size: cover;}'
				);
	} else
		$('#blurred').remove();
}

option_user_bg_image.id = 'userBGimage';
option_user_bg_image.label = '';
option_user_bg_image.type = 'image';
option_user_bg_image.tooltip = "Image to use as the background";
option_user_bg_image.tab = tabs.Style;

/* IMAGE HOVER EXPANSION */

function option_image_hover(toggle){}

option_image_hover.id = 'imageHover';
option_image_hover.label = 'Image Hover Expansion';
option_image_hover.type = 'checkbox';
option_image_hover.tooltip = 'Display image previews on hover';
option_image_hover.tab = tabs.Style;

// Toogle hover expansion of WebM

function option_webm_hover(){}

option_webm_hover.id = 'webmHover';
option_webm_hover.label = 'WebM Hover Expansion';
option_webm_hover.type = 'checkbox';
option_webm_hover.tooltip = 'Display WebM previews on hover. Requires Image Hover Expansion enabled.';
option_webm_hover.tab = tabs.Style;


/* INLINE EXPANSION */

function option_inline_expansion() {}

option_inline_expansion.id = 'inlinefit';
option_inline_expansion.label = 'Expansion';
option_inline_expansion.type = ['none', 'full', 'width', 'height', 'both'];
option_inline_expansion.labels = ['none', 'full-size', 'fit to width',
		'fit to height', 'fit to both'];
option_inline_expansion.tooltip = "Expand images inside the parent post and resize according to setting";
option_inline_expansion.tab = tabs.Style;


/* Clear LocalStorage */

function option_clean_ls() {
}
option_clean_ls.id = 'cleanls';
option_clean_ls.label = 'Restore Default Options';
option_clean_ls.type = 'button';
option_clean_ls.tooltip = 'Last resort to fix options.';
option_clean_ls.click = "localStorage.removeItem('options');";
option_clean_ls.tab = tabs.Help;


/* SHORTCUT KEYS */

var shortcuts = [
	{label: 'New Post', name: 'new', which: 78},
	{label: 'Image Spoiler', name: 'togglespoiler', which: 73},
	{label: 'Text Spoiler', name: 'textSpoiler', which: 68},
	{label: 'Finish Post', name: 'done', which: 83},
	{label: 'Expand All Images', name: 'expandAll', which: 69}
];

function select_shortcut(event) {
	if ($(event.target).is('input'))
		$(event.target).val('');
}

function change_shortcut(event) {
	if (event.which == 13)
		return false;
	var $input = $(event.target);
	var letter = $input.val();
	if (!(/^[a-z]$/i.exec(letter)))
		return;
	var which = letter.toUpperCase().charCodeAt(0);
	var name = $input.attr('id');
	if (!(name in shortcutKeys))
		return;
	shortcutKeys[name] = which;

	var shorts = options.get('shortcuts');
	if (!_.isObject(shorts)) {
		shorts = {};
		shorts[name] = which;
		options.set('shortcuts', shorts);
	}
	else {
		shorts[name] = which;
		options.trigger('change'); // force save
	}

	$input.blur();
}

_.defer(function () {
	load_ident();
	var save = _.debounce(save_ident, 1000);
	function prop() {
		if (postForm)
			postForm.propagate_ident();
		save();
	}
	$name.input(prop);
	$email.input(prop);

	optSpecs.forEach(function (spec) {
		spec.id = spec.id.replace(/\$BOARD/g, BOARD);
	});

	$('<a id="options">Options</a>').click(function () {
		var $opts = $('#options-panel');
		if (!$opts.length)
			if ($("body").hasClass("top-banner")) {
				$opts = make_options_panel().appendTo('#bannerRight');
			} else {
				$opts = make_options_panel().appendTo('body');
			}
		if ($opts.is(':hidden'))
			oneeSama.trigger('renderOptions', $opts);
		position_bmodal("#options-panel");
	}).insertAfter('#sync');

	optSpecs.forEach(function (spec) {
		spec(options.get(spec.id));
	});

	var prefs = options.get('shortcuts') || {};
	shortcuts.forEach(function (s) {
		shortcutKeys[s.name] = prefs[s.name] || s.which;
	});
});

/* TOGGLER FOR TOP BANNER BUTTONS */

function position_bmodal(target){
	var $t = $(target);
	if (!$t.is(':visible')){
		// Hide other visible modal windows
		$('.bmodal:visible').toggle('fast');
	}
	$t.toggle('fast');
}

$('#indentityContainer').click(function () {
	position_bmodal('#identity');
});

$('#bannerFAQ').click(function(){
	position_bmodal('#FAQ');
});

$('#volumeButton').click(function(){
	position_bmodal('#volumeController');
});

$('#volumeText').click(function(){
	position_bmodal('#volumeController');
});

// Highlight options button, if no options are set
if (!localStorage.getItem('options')){
	$('#options').addClass('noOptions');
	function fadeout(){
		$('.noOptions').fadeOut(fadein);
	}
	function fadein(){
		// Stop animation, if options pannel is opened
		if (!$('.noOptions').length)
			$('#options').fadeIn();
		$('.noOptions').fadeIn(fadeout);
	}
	fadeout();

	$('#options').click(function(){
		$('#options').removeClass('noOptions');
	});
}

function make_options_panel() {
	var $opts = $('<div/>', {"class": 'modal bmodal', id: 'options-panel'});
	$opts.change(function (event) {
		var $o = $(event.target), id = $o.attr('id'), val;
		var spec = _.find(optSpecs, function (s) {
			return s.id == id;
		});
		if (!spec)
			return;
		if (spec.type == 'checkbox')
			val = !!$o.prop('checked');
		else if (spec.type == 'revcheckbox')
			val = !$o.prop('checked');
		else if (spec.type == 'positive')
			val = Math.max(parseInt($o.val(), 10), 1);
		else if (spec.type == 'image')
			val = event.target;
		else
			val = $o.val();
		options.set(id, val);
		with_dom(function () {
			spec(val);
		});
	});
	var tabCont= {};	//will contain the html for the content of each tab
	optSpecs.forEach(function (spec) {
		var id = spec.id;
		if (nashi.opts.indexOf(id) >= 0)
			return;
		var val = options.get(id), $input, type = spec.type;
		if (type == 'checkbox' || type == 'revcheckbox') {
			var b = (type == 'revcheckbox') ? !val : val;
			$input = $('<input type="checkbox" />')
				.prop('checked', b ? 'checked' : null);
		}
		else if (type == 'positive') {
			$input = $('<input />', {
				width: '4em',
				maxlength: 4,
				val: val,
			});
		} else if (type == 'image'){
			$input = $('<input />', {
				type: 'file',
				title: spec.tooltip,
			});
		} else if (type == 'button'){
			$input = $('<button onclick="'+spec.click+'">'+spec.label+'</button>', {
				type: 'button',
				title: spec.tooltop,
			});
		}
		else if (type instanceof Array) {
			$input = $('<select/>');
			var labels = spec.labels || {};
			type.forEach(function (item, i) {
				var label = labels[i] || item;
				$('<option/>')
					.text(label).val(item)
					.appendTo($input);
			});
			if (type.indexOf(val) >= 0)
				$input.val(val);
		}
		var $label = $('<label/>').attr('for', id).attr('title', spec.tooltip).text(spec.label);
		if(tabCont[spec.tab]==undefined)
			tabCont[spec.tab]=[];
		tabCont[spec.tab].push($input.attr('id', id).attr('title', spec.tooltip), ' ', (spec.type == 'button' ? '' : $label), '<br>');
	});
	if (!nashi.shortcuts) {
		var $shortcuts;
		$shortcuts = $('<div/>', {
			id: 'shortcuts',
			click: select_shortcut,
			keyup: change_shortcut,
		});
		shortcuts.forEach(function (s) {
			var value = String.fromCharCode(shortcutKeys[s.name]);
			var $label = $('<label>', {text: s.label});
			$('<input>', {
				id: s.name, maxlength: 1, val: value,
			}).prependTo($label);
			$label.prepend(document.createTextNode('Alt+'));
			$shortcuts.append($label, '<br>');
		});
		tabCont[tabs.Shortcuts] = $shortcuts;
	}
	var $tabSel = $('<ul/>', {"class": 'option_tab_sel'});
	var $tabCont = $('<ul/>',{"class": 'option_tab_cont'});
	for(var tab in tabs){
		if(tabs[tab].length>0){
			$tabSel.append($('<li>').append($('<a>', { 	//tab selector
				'data-content':tab,
				href: ('#'+tab),
				text: tab,
			})));
			$tabCont.append($("<li\>",{					//tab content
				'data-content':tab
			}).append(tabCont[tabs[tab]]));
		}
	}
	var tabButts = $tabSel.children().children(); 	//tab buttons
	tabButts.on('click',function(event){
		event.preventDefault();
		var sel=$(this);
		if(!sel.hasClass('tab_sel')){
			tabButts.removeClass('tab_sel');
			var selCont =$tabCont.find('li[data-content="'+sel.data('content')+'"]');
			sel.addClass('tab_sel');
			selCont.siblings('li').removeClass('tab_sel');
			if(!isMobile)
				$tabCont.animate({
					'height': selCont.height(),
				},{
					complete: function(){ selCont.addClass('tab_sel'); },
					duration: 150
				});
			else selCont.addClass('tab_sel');
		}
	});

	$opts.append($tabSel);
	$opts.append($tabCont);

	var clickEvent = document.createEvent('MouseEvent');
	clickEvent.initEvent('click',true,true);
	tabButts[0].dispatchEvent(clickEvent); //tabButts[0].click() doesn't work in mobiles

	oneeSama.trigger('initOptions', $opts);
	return $opts.hide();
}

})();
