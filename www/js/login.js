(function () {
	var standalone = !!window.ExitURL;
	var $button1 = $('<a></a>', {
		href: '/auth/openid',
		id: 'login-button',
		class: 'persona-button dark',
		css: {'margin-top': '0.5em'}
	});
	var $button2 = $('<a></a>', {
		href: '#',
		id: 'logout-button',
		class: 'persona-button dark',
		css: {'margin-top': '0.5em'}
	});
	var $caption1 = $('<span>Loading...</span>').appendTo($button1);
	var $caption2 = $('<span>Loading...</span>').appendTo($button2);
	$button1.appendTo(standalone ? 'body' : 'fieldset');
	$button2.appendTo(standalone ? 'body' : 'fieldset');
	$(document).ready(setup_button());
	function inform1(msg, color) {
		$caption1.text(msg);
		$button1.toggleClass('orange', color == 'orange');
		$button1.toggleClass('dark', color == 'dark');
	}
	function inform2(msg, color) {
		$caption2.text(msg);
		$button2.toggleClass('orange', color == 'orange');
		$button2.toggleClass('dark', color == 'dark');
	}

	function setup_button() {
		inform1('Login', 'orange');
		$button1.click(function (event) {

		});
		inform2('Logout', 'blue');
		$button2.click(function (event) {
			on_logout();
			event.preventDefault();
		});
		$button1.focus();
	}

	function on_logout() {
		inform2('Logging out...', 'dark');
		$.ajax({
			type: 'POST',
			url: '../logout',
			data: {csrf: window.x_csrf},
			dataType: 'json',
			headers: {
				"Access-Control-Allow-Credentials" : true
			},
			error: function (res) {
				inform2('Network error.', 'dark');
				console.error(res);
			},
			success: function(res){
				if (res && res.status == 'okay') {
					inform2('Logged out.', 'orange');
					window.location.reload(true);
				}
				else
					inform2(res.message||'Unknown error.', 'dark');
			}
		});
	}

	$('<link/>', {
		rel: 'stylesheet',
		href: mediaURL + 'css/' + hotConfig.css['persona-buttons.css'],
	})
	.appendTo('head');
})();
