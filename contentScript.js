/**
 * adds the extension ID to the event name so it's unique and matches with what
 * host page fires.
 * @param  {string} name event name
 * @return {string}      new event name
 */
function getNamespacedEventName (name) {
  return chrome.runtime.id + '-' + name;
}

// 'polymer-ready' event means that the host page runs a Polymer app and it was loaded.
// We need to refresh our panel.
window.addEventListener('polymer-ready', function () {
  chrome.runtime.sendMessage({
    name: 'refresh'
  });
});

window.addEventListener(getNamespacedEventName('object-changed'), function (event) {
  chrome.runtime.sendMessage({
    name: 'object-changed',
    changeList: event.detail
  });
});

window.addEventListener(getNamespacedEventName('dom-mutation'), function (event) {
  chrome.runtime.sendMessage({
    name: 'dom-mutation',
    changeList: event.detail
  });
});

window.addEventListener(getNamespacedEventName('inspected-element-changed'), function (event) {
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
