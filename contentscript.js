
function serializeArray (arr) {
  var path = '[';
  var lastIndex = arr.length - 1;
  for (var i = 0; i <= lastIndex; i++) {
    path += ('"' + arr[i] + '"');
    if (i !== lastIndex) {
      path += ', ';
    }
  }
  path += ']';
  return path;
}

// 'polymer-ready' event means that the host page runs a Polymer app and it was loaded.
// We need to refresh our panel.
window.addEventListener('polymer-ready', function () {
  chrome.runtime.sendMessage({
    name: 'refresh'
  });
});

window.addEventListener('object-changed', function (event) {
  console.log('sent');
  chrome.runtime.sendMessage({
    name: 'object-changed',
    changeList: event.detail
  });
});
