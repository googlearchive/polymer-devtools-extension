(function () {
  function onMessage(message, sender, sendResponse) {
    chrome.runtime.sendMessage(message);
  }
  chrome.runtime.onMessage.addListener(onMessage);
})();
