(function () {
  // The cache equivalent to the DOM cache maintained in the host page.
  // Used to display object-tree in response to selection in element-tree.
  var polymerDOMCache;
  var elementTree;
  var objectTree;

  function copyArray (arr) {
    var newArr = [];
    for (var i = 0; i < arr.length; i++) {
      newArr.push(arr[i]);
    }
    return newArr;
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
    window.addEventListener('eval-helper-ready', function () {
      // Make all the definitions in the host page
      EvalHelper.defineFunctions([
        {
          name: 'highlight',
          string: highlight.toString()
        },
        {
          name: 'unhighlight',
          string: unhighlight.toString()
        },
        {
          name: 'scrollIntoView',
          string: scrollIntoView.toString()
        },
        {
          name: 'changeProperty',
          string: changeProperty.toString()
        },
        {
          name: 'resolveObject',
          string: resolveObject.toString()
        },
        {
          name: 'addObjectObserver',
          string: addObjectObserver.toString()
        },
        {
          name: 'removeObjectObserver',
          string: removeObjectObserver.toString()
        },
        {
          name: 'createCache',
          string: createCache.toString()
        },
        {
          name: 'addToCache',
          string: addToCache.toString()
        },
        {
          name: 'getPropPath',
          string: getPropPath.toString()
        },
        {
          name: 'getIndexMapObject',
          string: getIndexMapObject.toString()
        },
        {
          name: 'addToSubIndexMap',
          string: addToSubIndexMap.toString()
        },
        {
          name: 'addToIndexMap',
          string: addToIndexMap.toString()
        },
        {
          name: 'emptyIndexMap',
          string: emptyIndexMap.toString()
        },
        {
          name: 'removeFromSubIndexMap',
          string: removeFromSubIndexMap.toString()
        },
        {
          name: 'DOMSerializer',
          string: DOMSerializer.toString()
        }
      ], function (result, error) {
        EvalHelper.executeFunction('createCache', [], function (result, error) {

        });
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
      });
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

  function expandObject (path) {
    var pathString = serializeArray(path);
    var key = elementTree.selectedChild.key;
    var toEval = '(' + getObjectString.toString() + ')(' + key + ', ' +
      pathString + ');';
    chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
      var props = JSON.parse(result.data).value;
      var childTree = objectTree.tree;
      for (var i = 0; i < path.length; i++) {
        childTree = childTree[path[i]].value;
      }
      childTree.push.apply(childTree, props);
      toEval = 'window._polymerNamespace_.addObjectObserver(' + key +
        ', ' + pathString + ');';
      chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
        if (error) {
          // TODO
        }
      });
    });
  }

  window.addEventListener('polymer-ready', function () {
    init();
    elementTree = document.querySelector('element-tree');
    objectTree = document.querySelector('object-tree');
    // When an element in the element-tree is selected
    window.addEventListener('selected', function (event) {
      var key = event.detail.key;
      expandObject([]);
      highlightElement(key);
    });
    // When an element in the element-tree is unselected
    window.addEventListener('unselected', function (event) {
      objectTree.tree.length = 0;
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
      expandObject(event.detail.path);
    });
    window.addEventListener('object-collapse', function (event) {
      var path = serializeArray(event.detail.path);
      var key = elementTree.selectedChild.key;
      var toEval = 'window._polymerNamespace_.removeObjectObserver(' + key +
        ', ' + path + ');';
      toEval += 'window._polymerNamespace_.emptyIndexMap(' + key + ', ' +
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
          var index = change.index;
          var name = change.name;
          // This is a wrapped object. `value` contains the actual object.
          var newObj;
          if (type === 'delete') {
            newObj = JSON.parse(change.object).value[0];
            newObj.name = name;
            childTree.splice(index, 1);
          }
          var childTree = objectTree.tree;
          for (var i = 0; i < path.length; i++) {
            childTree = childTree[path[i]].value;
          }
          switch (type) {
            case 'update':
              childTree[index] = newObj;
              break;
            case 'add':
              childTree.push(newObj);
              break;
          }
        }
      }
    });
  });
})();
