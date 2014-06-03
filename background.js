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
		if (message.name === 'mark-up') {
      if (sender.tab.id in tabIdToPortMap) {
        var port = tabIdToPortMap[sender.tab.id];
        port.postMessage({
          name: 'mark-up',
          content: message.content
        });
      }
    }
	});
})();
