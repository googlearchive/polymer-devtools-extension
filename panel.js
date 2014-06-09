function DOMToPolymerDOM (DOM) {
  function recurseDOM (node) {
    var isPolymerElement = 'isPolymer' in node;
    var tree, i, child;
    if (isPolymerElement) {
      tree = {
        tagName: node.tagName,
        children: []
      };
      for (i = 0; i < node.children.length; i++) {
        child = recurseDOM(node.children[i]);
        if (child instanceof Array) {
          tree.children.push.apply(tree, child);
        } else {
          tree.children.push(child);
        }
      }
    } else {
      tree = [];
      for (i = 0; i < node.children.length; i++) {
        child = recurseDOM(node.children[i]);
        if (child instanceof Array) {
          tree.push.apply(tree, child);
        } else {
          tree.push(child);
        }
      }
    }
    return tree;
  }
  var polymerDOM = {};
  polymerDOM.tagName = '/';
  polymerDOM.children = recurseDOM(DOM);
  return polymerDOM;
}

function refreshPanel () {
  var toEval = '(' + getDOMString.toString() + ')()';
  var DOM;
  var elementTree = document.querySelector('element-tree');
  chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
    if (error) {
      // TODO
    }
    var parser = new DOMParser();
    DOM = parser.parseFromString(result.data, 'text/html');
    DOMToPolymerDOM(DOM.body);
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
