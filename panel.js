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

  function copyArray (arr) {
    var newArr = [];
    for (var i = 0; i < arr.length; i++) {
      newArr.push(arr[i]);
    }
    return newArr;
  }

  function serializeArray (arr) {
    var path = '[';
    var lastIndex = arr.length - 1;
    for (var i = 0; i <= lastIndex; i++) {
      path += ('"' + arr[i] + '"');
      if (i !== lastIndex) {
        path += ', ';
      }
    }
    path += ']';
    return path;
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
    // Make all the definitions in the host page
    var toEval = 'window._polymerNamespace_ = {}; window._polymerNamespace_.DOMSerializer = ' + DOMSerializer.toString() + ';';
    toEval += 'window._polymerNamespace_.observerCache = {};';
    toEval += 'window._polymerNamespace_.highlight = ' + highlight.toString() + ';';
    toEval += 'window._polymerNamespace_.unhighlight = ' + unhighlight.toString() + ';';
    toEval += 'window._polymerNamespace_.scrollIntoView = ' + scrollIntoView.toString() + ';';
    toEval += 'window._polymerNamespace_.changeProperty = ' + changeProperty.toString() + ';';
    toEval += 'window._polymerNamespace_.resolveObject = ' + resolveObject.toString() + ';';
    toEval += 'window._polymerNamespace_.addObjectObserver = ' + addObjectObserver.toString() + ';';
    toEval += 'window._polymerNamespace_.removeObjectObserver = ' + removeObjectObserver.toString() + ';';
    toEval += 'window._polymerNamespace_.createCache = ' + createCache.toString() + ';';
    toEval += 'window._polymerNamespace_.addToIndexMap = ' + addToIndexMap.toString() + ';';
    toEval += 'window._polymerNamespace_.getIndexMapObject = ' + getIndexMapObject.toString() + ';';
    toEval += 'window._polymerNamespace_.getPropPath = ' + getPropPath.toString() + ';';
    toEval += 'window._polymerNamespace_.addToCache = ' + addToCache.toString() + ';';
    toEval += 'window._polymerNamespace_.removeFromIndexMap = ' + removeFromIndexMap.toString() + ';';
    toEval += 'window._polymerNamespace_.createCache();';
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
      objectTree.tree = (polymerDOMCache[key].JSONobj.value);
      highlightElement(key);
    });
    // When an element in the element-tree is unselected
    window.addEventListener('unselected', function (event) {
      objectTree.tree = [];
      unhighlightElement();
    });
    // When a property in the object-tree changes
    window.addEventListener('property-changed', function (event) {
      var newValue = event.detail.value;
      var path = serializeArray(event.detail.path);
      var key = elementTree.selectedChild.key;
      // Reflect a change in property in the host page
      var toEval = 'window._polymerNamespace_.changeProperty(' + key + ', ' + path + ', ' + newValue + ');';
      chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
        if (error) {
          throw error;
        }
      });
    });
    window.addEventListener('object-expand', function (event) {
      var path = serializeArray(event.detail.path);
      var key = elementTree.selectedChild.key;
      var toEval = '(' + getObjectString.toString() + ')(' + key + ', ' +
        path + ');';
      chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
        var props = JSON.parse(result.data).value;
        var childTree = objectTree.tree;
        for (var i = 0; i < event.detail.path.length - 1; i++) {
          childTree = childTree[event.detail.path[i]].value;
        }
        var arr = childTree[event.detail.path[i]].value;
        arr.push.apply(arr, props);
        toEval = 'window._polymerNamespace_.addObjectObserver(' + key +
          ', ' + path + ');';
        chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
          if (error) {
            // TODO
          }
        });
      });
    });
    window.addEventListener('object-collapse', function (event) {
      var path = serializeArray(event.detail.path);
      var key = elementTree.selectedChild.key;
      var toEval = 'window._polymerNamespace_.removeObjectObserver(' + key +
        ', ' + path + ');';
      toEval += 'window._polymerNamespace_.removeFromIndexMap(' + key + ', ' +
        path + ');';
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
      } else if (message.name === 'object-changed') {
        var changeObj = JSON.parse(message.changeList);
        var path = changeObj.path;
        var changes = changeObj.changes;
        for (var i = 0; i < changes.length; i++) {
          var change = changes[i];
          var type = change.type;
          var name = change.name;
          // This is a wrapped object. `value` contains the actual object.
          var newObj = JSON.parse(change.object).value.value;
          newObj.name = name;
          switch (type) {
            case 'update':
              var newPath = copyArray(path);
              newPath.push(name);
              var objectTreeNode = objectTree.getChildNode(newPath);
              objectTreeNode.empty();
              objectTreeNode.init(newObj, newPath);
              break;
            case 'add':
              break;
            case 'delete':
              break;
          }
        }
      }
    });
  });
})();
