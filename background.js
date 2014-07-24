// Responsible for channeling messages from devtools pane and content scripts
// Here is where the associations between them are made across tabs.

(function () {
  var tabIdToPortMap = {};
  var portIdToTabIdMap = {};
  var portIdToPortMap = {};
  // To assign port IDs to ports because ports aren't hashable
  var lastPortId = 0;

  // A panel just tried to connect to the extension background
  chrome.runtime.onConnect.addListener(function (port) {
    var portId;
    function onMessage (message, sender, sendResponse) {
      switch (message.name) {
        case 'panel-init':
          portId = ++lastPortId;
          tabIdToPortMap[message.tabId] = port;
          portIdToTabIdMap[portId] = message.tabId;
          portIdToPortMap[portId] = port;

          chrome.tabs.executeScript(message.tabId, {
            file: 'contentScript.js'
          });
          break;
        case 'fresh-page':
          // Tab's location had changed and the page confirmed that it was a refresh.
          // Start the content script.
          chrome.tabs.executeScript(message.tabId, {
            file: 'contentScript.js'
          });
          // Ask the panel to reload itself
          port.postMessage({
            name: 'refresh'
          });
          break;
      }
    }
    // We expect a `panel-init` message from it soon after the connection.
    port.onMessage.addListener(onMessage);
    // When a panel closes
    port.onDisconnect.addListener(function () {
      // Find the tab
      tabId = portIdToTabIdMap[portId];
      // Delete all associations
      delete portIdToTabIdMap[portId];
      delete portIdToPortMap[portId];
      delete tabIdToPortMap[tabId];

      // Send a message to the content script do necessary clean-up
      chrome.tabs.sendMessage(tabId, {
        name: 'clean-up'
      });
    });
  });

  // All the communcation
  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    var port = tabIdToPortMap[sender.tab.id];
    if (!port) {
      return;
    }
    switch (message.name) {
      case 'object-changed':
        // When an object changes
        port.postMessage({
          name: 'object-changed',
          changeList: message.changeList
        });
        break;
      case 'dom-mutation':
        // When a DOM mutation occurs
        port.postMessage({
          name: 'dom-mutation',
          changeList: message.changeList
        });
        break;
      case 'inspected-element-changed':
        // When element selection changes in the inspector
        port.postMessage({
          name: 'inspected-element-changed',
          key: message.key
        });
        break;
      case 'polymer-ready':
        // If `polymer-ready` happens after chrome.tabs detects page reload.
        port.postMessage({
          name: 'refresh'
        });
        break;
    }
	});

  // When a tab gets updated
  // Sequence of events:
  // 1. Background-page to panel => 'check-page-refresh'
  // Possibly (if page is fresh):
  // 2. panel to Background-page => 'fresh-page'
  // 3. Background-page to panel => 'refresh'
  // Possibly (if `polymer-ready` happened after content script was loaded):
  // 4. content-script to background-page => 'polymer-ready'
  // 5. background-page to panel => 'refresh'
  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
      // Only if it has finished loading
      if (tabId in tabIdToPortMap) {
        // If extension was open in this tab, send a message to check if this was
        // an actual page reload. Further action is based on the response to this.
        var port = tabIdToPortMap[tabId];
        port.postMessage({
          name: 'check-page-fresh'
        });
      }
    }
  });
})();
