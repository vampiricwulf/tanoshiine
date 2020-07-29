// TODO: Rewrite all banner-related code with Backbone and move them here

// Notification messages bellow the banner
var NotificationView = Backbone.View.extend({
	initialize: function(msg){
		this.render(msg);
	},

	events: {
		'click': 'remove'
	},

	render: function(msg){
		var $banner = $('#bannerCenter');
		$('.notification').remove();
		this.$el.html('<span class="notification modal"><b class="admin">' + msg + '</b></span>')
			.css('top', $banner.outerHeight() + 5 + 'px')
			.insertAfter($banner);
		return this;
	},
});

dispatcher[DEF.NOTIFICATION] = function(msg){
	new NotificationView(msg);
};
