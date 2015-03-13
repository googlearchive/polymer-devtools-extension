// This content script runs on all pages. It can't be conditionally injected because we can't
// miss out on any events by the time the script gets injected. On the other hand manifest.json allows
// us to name content scripts to be run at 'document_start' which seemed like the ideal time.
(function () {

	// Used to style console.log messages.
	var messageStyle = 'color: blue; font-size: 15px;';
	var timeStyle = 'color: green; font-size: 13px';

	function getFormattedDate() {
		var date = new Date();
		var str = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
			date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + ':' + date.getMilliseconds();
		return str;
	}

	console.log('%cDocument start: ', messageStyle);
	console.log('%c' + getFormattedDate(), timeStyle);

	// 'polymer-ready' event means that the host page runs a Polymer app and it just got upgraded by Polymer.
	window.addEventListener('polymer-ready', function() {
		console.log('%cpolymer-ready:', messageStyle);
		console.log('%c' + getFormattedDate(), timeStyle);
		chrome.runtime.sendMessage({
			name: 'polymer-ready'
		});
	});
})();
