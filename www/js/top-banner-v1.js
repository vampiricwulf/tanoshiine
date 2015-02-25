var write_bannerTop;
(write_bannerTop = function(){
	var xhr;
	var xhr = new XMLHttpRequest();
	xhr.open("GET", location.origin + "/banner.txt", true);
	xhr.onload = function() {
		var text = xhr.responseText;
		document.getElementById('bannerCenter').innerHTML = '<b>' + text + '</b>';
		return setTimeout(write_bannerTop, 10000);
	}
	xhr.send(null);
})();
