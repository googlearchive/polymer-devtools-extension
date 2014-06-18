(function () {
  // The cache equivalent to the DOM cache maintained in the host page.
  // Used to display object-tree in response to selection in element-tree.
  var polymerDOMCache;

  /*function DOMToPolymerDOM (DOM) {
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
  }*/

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
    // Make all the definitions in the host page
    var toEval = 'window._polymerNamespace_ = {}; window._polymerNamespace_.highlight = ' + highlight.toString() + ';';
    toEval += 'window._polymerNamespace_.unhighlight = ' + unhighlight.toString() + ';';
    toEval += 'window._polymerNamespace_.scrollIntoView = ' + scrollIntoView.toString() + ';';
    toEval += 'window._polymerNamespace_.changeProperty = ' + changeProperty.toString() + ';';
    toEval += 'window._polymerNamespace_.DOMSerializer = ' + DOMSerializer.toString() + ';';
    // Inject code to get serialized DOM string
    toEval += '(' + getDOMString.toString() + ')();';
    var DOM;
    var elementTree = document.querySelector('element-tree');
    var objectTree = document.querySelector('object-tree');
    chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
      if (error) {
        throw error;
      }
      DOM = JSON.parse(result.data);
      polymerDOMCache = {};
      cacheDOM(DOM);
      elementTree.initFromDOMTree(DOM);
      objectTree.empty();
    });
  }

  /**
  * Highlight an element in the page
  */
  function highlightElement (key) {
    var toEval = 'window._polymerNamespace_.highlight(' + key + ');';
    toEval += 'window._polymerNamespace_.scrollIntoView(' + key + ')';
    chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
      if (error) {
        throw error;
      }
    });
  }

  /**
  * Unhighlight the highlighted element in the page
  */
  function unhighlightElement (key) {
    var toEval = 'window._polymerNamespace_.unhighlight();';
    chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
      if (error) {
        throw error;
      }
    });
  }

  window.addEventListener('polymer-ready', function () {
    init();
    var elementTree = document.querySelector('element-tree');
    var objectTree = document.querySelector('object-tree');
    // When an element in the element-tree is selected
    window.addEventListener('selected', function (event) {
      var key = event.detail.key;
      objectTree.initFromObjectTree(polymerDOMCache[key].JSONobj);
      highlightElement(key);
    });
    // When an element in the element-tree is unselected
    window.addEventListener('unselected', function (event) {
      objectTree.empty();
      unhighlightElement();
    });
    // When a property in the object-tree changes
    window.addEventListener('property-changed', function (event) {
      var newValue = event.detail.value;
      var prop = event.detail.prop;
      var key = elementTree.selectedChild.key;
      // Reflect a change in property in the host page
      var toEval = 'window._polymerNamespace_.changeProperty(' + key + ', "' + prop + '", ' + newValue + ');';
      chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
        if (error) {
          throw error;
        }
      });
    });
    window.addEventListener('object-toggle', function (event) {
      var path = '[';
      for (var i = 0; i < event.detail.path.length; i++) {
        if (i === event.detail.path.length - 1) {
          path += ('"' + event.detail.path[i] + '"');
        }
      }
      path += ']';
      var key = elementTree.selectedChild.key;
      if (event.detail.expand) {
        var toEval = 'window._polymerNamespace_.getObjectString(' + key + ', ' +
          path + ');';
        chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
          var obj = JSON.parse(result.data);
          console.log(obj);
        });
      }
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
