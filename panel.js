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

  function init () {
    var toEval = 'window._polymerNamespace_ = {}; window._polymerNamespace_.highlight = ' + highlight.toString() + ';';
    toEval += 'window._polymerNamespace_.unhighlight = ' + unhighlight.toString() + ';';
    toEval += 'window._polymerNamespace_.scrollIntoView = ' + scrollIntoView.toString() + ';';
    toEval += 'window._polymerNamespace_.changeProperty = ' + changeProperty.toString() + ';';
    toEval += DOMSerializer.toString() + ';(' + getDOMString.toString() + ')()';
    var DOM;
    var elementTree = document.querySelector('element-tree');
    var objectTree = document.querySelector('object-tree');
    chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
      if (error) {
        // TODO
      }
      DOM = JSON.parse(result.data);
      console.log(DOM);
      cacheDOM(DOM);
      elementTree.initFromDOMTree(DOM);
    });
  }

  function highlightElement (key) {
    var toEval = 'window._polymerNamespace_.highlight(' + key + ');';
    toEval += 'window._polymerNamespace_.scrollIntoView(' + key + ')';
    chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
      if (error) {
        // TODO
      }
    });
  }
  function unhighlightElement (key) {
    var toEval = 'window._polymerNamespace_.unhighlight();';
    chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
      if (error) {
        // TODO
      }
    });
  }

  window.addEventListener('polymer-ready', function () {
    init();
    var elementTree = document.querySelector('element-tree');
    var objectTree = document.querySelector('object-tree');
    window.addEventListener('selected', function (event) {
      var key = event.detail.key;
      objectTree.initFromObjectTree(polymerDOMCache[key].JSONobj);
      highlightElement(key);
    });
    window.addEventListener('unselected', function (event) {
      objectTree.empty();
      unhighlightElement();
    });
    window.addEventListener('property-changed', function (event) {
      var newValue = event.detail.value;
      var prop = event.detail.prop;
      var key = elementTree.selectedChild.key;
      var toEval = 'window._polymerNamespace_.changeProperty(' + key + ', "' + prop + '", ' + newValue + ');';
      chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
        if (error) {
          // TODO
        }
      });
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
        init();
      }
    });
  });
})();
