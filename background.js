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
      if (message.name === 'panel-init') {
        portId = ++lastPortId;
        tabIdToPortMap[message.tabId] = port;
        portIdToTabIdMap[portId] = message.tabId;
        portIdToPortMap[portId] = port;
        port.onMessage.removeListener(onMessage);

        chrome.tabs.executeScript(message.tabId, {
          file: 'contentScript.js'
        });
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
      case 'refresh':
        port.postMessage({
          name: 'refresh',
        });
        break;
      case 'object-changed':
        port.postMessage({
          name: 'object-changed',
          changeList: message.changeList
        });
        break;
      case 'dom-mutation':
        port.postMessage({
          name: 'dom-mutation',
          changeList: message.changeList
        });
        break;
      case 'inspected-element-changed':
        port.postMessage({
          name: 'inspected-element-changed',
          key: message.key
        });
    }
	});
})();
