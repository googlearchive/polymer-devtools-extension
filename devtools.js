chrome.devtools.panels.create("Test",
  null,
  "panel.html",
  null
);
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  document.querySelector('#content').innerHTML = message;
});
