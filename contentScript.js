
// 'polymer-ready' event means that the host page runs a Polymer app and it was loaded.
// We need to refresh our panel.
window.addEventListener('polymer-ready', function () {
  chrome.runtime.sendMessage({
    name: 'refresh'
  });
});

window.addEventListener('object-changed', function (event) {
  chrome.runtime.sendMessage({
    name: 'object-changed',
    changeList: event.detail
  });
});

window.addEventListener('dom-mutation', function (event) {
  chrome.runtime.sendMessage({
    name: 'dom-mutation',
    changeList: event.detail
  });
});

window.addEventListener('inspected-element-changed', function (event) {
  chrome.runtime.sendMessage({
    name: 'inspected-element-changed',
    key: event.detail.key
  });
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.name === 'clean-up') {
    window.dispatchEvent(new CustomEvent('clean-up'));
  }
});
