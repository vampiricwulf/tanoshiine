(function () {

var enabled = reportConfig.REPORTS;
var captchaTimeout = 5 * 60 * 1000;
var REPORTS = {};
var PANEL;

if (enabled)
	menuOptions.push('Report');

var captchaURL = '/captcha/';

var Report = Backbone.Model.extend({
	defaults: {
		status: 'setup',
		hideAfter: true,
		captchaID: '',
	},

	request_new: function () {
		var self = this;
		$.ajax({
			url: captchaURL,
			success: renderCaptcha,
			error: handleLoadError,
		});
		self.set('status', 'ready');

		if (this.get('timeout'))
			clearTimeout(this.get('timeout'));

		this.set('timeout', setTimeout(function () {
			self.set({
				timeout: 0,
				status: 'error',
				error: 'Captcha timed out',
			});
		}, captchaTimeout));


		function renderCaptcha(captcha) {
			var captchaDiv = document.getElementById('captcha');
			var form = document.createElement('form');
			form.method = 'post';
			form.class = 'captchouli-width captchouli-form';
			form.style = 'font-family: Sans-Serif';
			form.innerHTML = captcha;
			self.set('captchaID', form['captchouli-id'].value)
			form.addEventListener('submit', handleSubmit);
			captchaDiv.innerHTML = '';
			captchaDiv.appendChild(form);
			setTimeout(function(){
				$('.captchouli-width').width($('.captchouli-img').width()*3.2);
				$('input.captchouli-width').width($('.captchouli-img').width()*3);
			},100);
		}
		function handleLoadError() {
			self.set({
				status: 'error',
				error: 'Couldn\'t load captcha.',
			})
		}
		function handleSubmitError() {
			self.set({
				status: 'error',
				error: 'Couldn\'t submit solution.',
			})
		}
		function handleSubmit(event) {
			event.preventDefault();
			var formData = $(event.target).serialize();
			$.ajax({
				url: captchaURL,
				type: 'POST',
				data: formData,
				processData: false,
				contentType: 'application/x-www-form-urlencoded',
				success: handleResponse,
				error: handleSubmitError
			});
		}
		function handleResponse(resp) {
			var captchaDiv = document.getElementById('captcha');
			if (resp === self.get('captchaID')) {
				captchaDiv.innerText = 'Captcha success';
				self.set('status', 'ready');
			} else {
				renderCaptcha(resp);
			}
		}

	},

	did_report: function () {
		delete REPORTS[this.id];
		if (this.get('timeout')) {
			clearTimeout(this.get('timeout'));
			this.set('timeout', 0);
		}

		var self = this;
		setTimeout(function () {
			self.trigger('destroy');
		}, 1500);

		if (this.get('hideAfter'))
			this.get('post').set('hide', true);
	},
});

var ReportPanel = Backbone.View.extend({
	id: 'report-panel',
	tagName: 'form',
	className: 'modal',

	events: {
		submit: 'submit',
		'click .close': 'remove',
		'click .hideAfter': 'hide_after_changed',
	},

	initialize: function () {
		this.$captcha = $('<div id="captcha" style="white-space: initial; max-width: 80vw;"/>');
		this.$message = $('<div class="message"/>');
		this.$submit = $('<input>', {type: 'submit', val: 'Report'});
		var $hideAfter = $('<input>', {
			'class': 'hideAfter',
			type: 'checkbox',
			checked: this.model.get('hideAfter'),
		});
		var $hideLabel = $('<label>and hide</label>')
			.append($hideAfter);
		this.$description = $('<input type="text" class="reportDescription" placeholder="Description (Optional)"/>');
		var num = this.model.id;

		this.$el
		.append('Reporting post ')
		.append($('<a/>', {href: '#'+num, text: '>>'+num}))
		.append('<a class="close" href="#">x</a>')
		.append(this.$message)
		.append('</br>')
		.append(this.$description)
		.append(this.$captcha)
		.append(this.$submit)
		.append(' ', $hideLabel);

		/* HACK */
		if (window.x_csrf) {
			this.model.set('hideAfter', false);
			$hideLabel.remove();
		}

		if ($(window).width() < 470) {
			this.$el
			.css('transform','scale('+$(window).width()/500+')')
			.css('transform-origin','bottom right');
		}

		this.listenTo(this.model, {
			'change:error': this.error_changed,
			'change:status': this.status_changed,
			destroy: this.remove,
		});
	},

	render: function () {
		this.error_changed();
		this.status_changed();
		return this;
	},

	submit: function () {
		if (this.model.get('status') != 'ready')
			return false;
		send([DEF.REPORT_POST, this.model.id,
				this.model.get('captchaID'), this.$description.val()]);
		this.model.set('status', 'reporting');
		return false;
	},

	error_changed: function () {
		this.$message.text(this.model.get('error'));
	},

	status_changed: function () {
		var status = this.model.get('status');
		this.$submit
			.prop('disabled', status != 'ready')
			.toggle(status != 'done')
			.val(status=='reporting' ? 'Reporting...' : 'Report');
		this.$captcha.toggle(
			_.contains(['ready', 'reporting', 'error'], status));
		if (status == 'done')
			this.$('label').remove();

		var msg;
		if (status == 'done')
			msg = 'Report submitted!';
		else if (status == 'setup')
			msg = 'Obtaining captcha...';
		else if (status == 'error')
			msg = 'E';
		else if (status == 'ready' && this.model.get('error'))
			msg = 'E';
		this.$message.text(msg=='E' ? this.model.get('error') : msg);
		this.$message
			.toggle(!!msg)
			.toggleClass('error', msg == 'E');

		// not strictly view logic, but only relevant when visible
		if (status == 'done')
			this.model.did_report();
		else if (status == 'error')
			this.model.request_new();
	},

	hide_after_changed: function (e) {
		this.model.set('hideAfter', e.target.checked);
	},

	remove: function () {
		Backbone.View.prototype.remove.call(this);
		if (PANEL == this) {
			PANEL = null;
		}
		return false;
	},
});

menuHandlers.Report = function (post) {
	var num = post.id;
	var model = REPORTS[num];
	if (!model)
		REPORTS[num] = model = new Report({id: num, post: post});

	if (PANEL) {
		if (PANEL.model === model) {
			PANEL.focus();
			return;
		}
		PANEL.remove();
	}
	PANEL = new ReportPanel({model: model});
	PANEL.render().$el.appendTo('body');
	model.request_new();
};

dispatcher[DEF.REPORT_POST] = function (msg, op) {
	var num = msg[0], etc = msg[1];
	var report = REPORTS[num];
	if (report)
		report.set(msg[1] || {status: 'done'});
};

})();
