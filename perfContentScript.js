// This content script runs on all pages. It can't be conditionally injected because we can't
// miss out on any events by the time the script gets injected. On the other hand manifest.json allows
// us to name content scripts to be run at 'document_start' which seemed like the ideal time.

console.log('Document start');
console.log(new Date());

// 'polymer-ready' event means that the host page runs a Polymer app and it just got upgraded by Polymer.
window.addEventListener('polymer-ready', function() {
  console.log('polymer-ready');
  console.log(new Date());
  chrome.runtime.sendMessage({
    name: 'polymer-ready'
  });
});
