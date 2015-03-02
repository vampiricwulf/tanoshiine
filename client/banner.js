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
		this.$el = $('<span/>', {
			'class': 'notification modal'
		})
			.html('<b>'+msg+'</b>')
			.css('top', $banner.outerHeight() + 5 + 'px')
			.insertAfter($banner);
		return this;
	},
});

dispatcher[DEF.NOTIFICATION] = function(msg){
	new NotificationView(msg);
};

dispatcher[DEF.UPDATE_BANNER] = function(msg) {
	Banner.renderInfo(msg[0]);
};

var BannerView = Backbone.View.extend({
	initialize: function() {

	},

	renderInfo: function(msg) {
		this.$el.children('#bannerBot').html(msg);
	}
});

var Banner = new BannerView({
	el: $('#bannerBot')[0]
});
