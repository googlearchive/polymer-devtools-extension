(function () {
  var polymerDOMCache = {};

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

  function getDOMString() {
    var serializer = new DOMSerializer();
    return {
      'data': serializer.serialize(document.body)
    };
  }

  function cacheDOM (dom) {
    if (!dom) {
      return;
    }
    polymerDOMCache[dom.key] = dom;
    for (var i = 0; i < dom.children.length; i++) {
      cacheDOM(dom.children[i]);
    }
  }

  function refreshPanel () {
    var toEval = DOMSerializer.toString() + ';(' + getDOMString.toString() + ')()';
    var DOM;
    var elementTree = document.querySelector('element-tree');
    var objectTree = document.querySelector('object-tree');
    chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
      if (error) {
        // TODO
      }
      DOM = JSON.parse(result.data);
      cacheDOM(DOM);
      elementTree.initFromDOMTree(DOM);
    });
  }

  window.addEventListener('polymer-ready', function () {
    refreshPanel();
    var elementTree = document.querySelector('element-tree');
    var objectTree = document.querySelector('object-tree');
    elementTree.addEventListener('selected', function (event) {
      var key = event.detail.key;
      objectTree.initFromObjectTree(polymerDOMCache[key].JSONobj);
    });
    elementTree.addEventListener('unselected', function (event) {
      objectTree.empty();
    });
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
})();
