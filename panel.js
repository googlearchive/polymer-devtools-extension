(function () {
  // The cache equivalent to the DOM cache maintained in the host page.
  // Used to display object-tree in response to selection in element-tree.
  var polymerDOMCache;
  var elementTree;
  var objectTree;
  var methodList;
  var EvalHelper;
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
    var DOM;
    elementTree = document.querySelector('element-tree');
    objectTree = document.querySelector('object-tree');
    methodList = document.querySelector('method-list');
    createEvalHelper(function (helper) {
      EvalHelper = helper;
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
          name: 'getProperty',
          string: getProperty.toString()
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
        },
        {
          name: 'getObjectString',
          string: getObjectString.toString()
        },
        {
          name: 'getDOMString',
          string: getDOMString.toString()
        }
      ], function (result, error) {
        EvalHelper.executeFunction('createCache', [], function (result, error) {
          if (error) {
            throw error;
          }
          EvalHelper.executeFunction('getDOMString', [], function (result, error) {
            DOM = JSON.parse(result.data);
            polymerDOMCache = {};
            cacheDOM(DOM);
            elementTree.initFromDOMTree(DOM);
          });
        });
      });
    });
  }

  /**
  * Highlight an element in the page
  */
  function highlightElement (key) {
    EvalHelper.executeFunction('highlight', [key]);
    EvalHelper.executeFunction('scrollIntoView', [key]);
  }

  /**
  * Unhighlight the highlighted element in the page
  */
  function unhighlightElement (key) {
    EvalHelper.executeFunction('unhighlight', []);
  }

  function expandObject (path) {
    var key = elementTree.selectedChild.key;
    EvalHelper.executeFunction('getObjectString', [key, path], function (result, error) {
      var props = JSON.parse(result.data).value;
      var childTree = objectTree.tree;
      for (var i = 0; i < path.length; i++) {
        childTree = childTree[path[i]].value;
      }
      childTree.push.apply(childTree, props);
      EvalHelper.executeFunction('addObjectObserver', [key, path], function (result, error) {
        if (error) {
          throw error;
        }
      });
    });
  }

  function displayMethods (path) {
    methodList.list = objectTree.tree;
  }

  window.addEventListener('polymer-ready', function () {
    init();
    // When an element in the element-tree is selected
    window.addEventListener('selected', function (event) {
      var key = event.detail.key;
      expandObject([]);
      displayMethods();
      // Visually highlight the element in the page and scroll it into view
      highlightElement(key);
    });
    // When an element in the element-tree is unselected
    window.addEventListener('unselected', function (event) {
      var key = event.detail.key;
      EvalHelper.executeFunction('removeObjectObserver', [key, []], function (result, error) {
        if (error) {
          throw error;
        }
        EvalHelper.executeFunction('emptyIndexMap', [key, []]);
      });
      // Empty the object tree
      objectTree.tree.length = 0;
      unhighlightElement();
    });
    // When a property in the object-tree changes
    window.addEventListener('property-changed', function (event) {
      var newValue = event.detail.value;
      var path = event.detail.path;
      var key = elementTree.selectedChild.key;
      // Reflect a change in property in the host page
      EvalHelper.executeFunction('changeProperty', [key, path, newValue],
        function (result, error) {
          if (error) {
            throw error;
          }
        }
      );
    });
    window.addEventListener('refresh-property', function (event) {
      var index = event.detail.path[event.detail.path.length - 1];
      var key = elementTree.selectedChild.key;
      var childTree = event.detail.tree;
      var path = event.detail.path;
      var propName = event.detail.name;
      EvalHelper.executeFunction('getProperty', [key, path], function (result, error) {
        var newObj = JSON.parse(result).value[0];
        newObj.hasAccessor = true;
        newObj.name = propName;
        childTree[index] = newObj;
      });
    });
    window.addEventListener('object-expand', function (event) {
      expandObject(event.detail.path);
    });
    // An object has been collapsed. We must remove the object observer
    // and empty the index-propName map in the host page for this object
    window.addEventListener('object-collapse', function (event) {
      var key = elementTree.selectedChild.key;
      var path = event.detail.path;
      EvalHelper.executeFunction('removeObjectObserver', [key, path], function (result, error) {
        if (error) {
          throw error;
        }
        EvalHelper.executeFunction('emptyIndexMap', [key, path]);
      });
    });
    var backgroundPageConnection = chrome.runtime.connect({
      name: 'panel'
    });
    // Send a message to background page so that the background page can associate panel
    // to the current host page
    backgroundPageConnection.postMessage({
      name: 'panel-init',
      tabId: chrome.devtools.inspectedWindow.tabId
    });
    backgroundPageConnection.onMessage.addListener(function (message, sender, sendResponse) {
      if (message.name === 'refresh') {
        // A page refresh has happened
        init();
      } else if (message.name === 'object-changed') {
        // An object has changed. Must update object-tree

        // The list of changes
        var changeObj = JSON.parse(message.changeList);
        // The path where the change happened
        var path = changeObj.path;
        var changes = changeObj.changes;
        for (var i = 0; i < changes.length; i++) {
          var change = changes[i];
          var type = change.type;
          // Index refers to the index in object-tree corresponding to the property
          var index = change.index;
          // Name refers to the actual property name
          var name = change.name;
          // This is a wrapped object. `value` contains the actual object.
          var newObj;
          var childTree = objectTree.tree;
          for (var j = 0; j < path.length; j++) {
            childTree = childTree[path[j]].value;
          }
          if (type !== 'delete') {
            newObj = JSON.parse(change.object).value[0];
            newObj.name = name;
          } else {
            childTree.splice(index, 1);
            return;
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
