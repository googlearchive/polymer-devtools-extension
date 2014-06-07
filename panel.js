function refreshPanel() {
  var toEval = '(' + getDOMString.toString() + ')()';
  var DOM;
  var elementTree = document.querySelector('element-tree')
  chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
    if (error) {
      // TODO
    }
    var parser = new DOMParser();
    DOM = parser.parseFromString(result.data, 'text/html');
    elementTree.initFromDOMTree(DOM.body);
  });
}
window.addEventListener('polymer-ready', function () {
  refreshPanel();
  var backgroundPageConnection = chrome.runtime.connect({
    name: 'panel'
  });
  backgroundPageConnection.postMessage({
    name: 'panel-init',
    tabId: chrome.devtools.inspectedWindow.tabId
  });
  backgroundPageConnection.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.name === 'refresh') {
      refreshPanel();      
    }
  });
});
