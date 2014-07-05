(function () {
  var tabIdToPortMap = {};
  var portIdToTabIdMap = {};
  var portIdToPortMap = {};
  var lastPortId = 0;

  chrome.runtime.onConnect.addListener(function (port) {
    var portId;
    function onMessage (message, sender, sendResponse) {
      if (message.name === 'panel-init') {
        portId = ++lastPortId;
        tabIdToPortMap[message.tabId] = port;
        portIdToTabIdMap[portId] = message.tabId;
        portIdToPortMap[portId] = port;
      }
    }
    port.onMessage.addListener(onMessage);
    port.onDisconnect.addListener(function () {
      tabId = portIdToTabIdMap[portId];
      port.onMessage.removeListener(onMessage);
      delete portIdToTabIdMap[portId];
      delete portIdToPortMap[portId];
      delete tabIdToPortMap[tabId];
    });
  });

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    var port = tabIdToPortMap[sender.tab.id];
    if (message.name === 'refresh') {
      port && port.postMessage({
        name: 'refresh',
      });
    } else if (message.name === 'object-changed') {
      port && port.postMessage({
        name: 'object-changed',
        changeList: message.changeList
      });
    } else if (message.name === 'dom-mutation') {
      port && port.postMessage({
        name: 'dom-mutation',
        changeList: message.changeList
      });
    }
	});
})();
