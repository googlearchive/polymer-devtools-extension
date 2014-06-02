chrome.devtools.panels.create("Test",
  "sandwich-16.png",
  "panel.html",
  null
);
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  document.querySelector('#content').innerHTML = message;
});
