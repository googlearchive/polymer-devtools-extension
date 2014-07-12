(function () {
  // The cache equivalent to the DOM cache maintained in the host page.
  // Used to display object-tree in response to selection in element-tree.
  var elementTree;
  var objectTree;
  var methodList;
  var EvalHelper;

  function init () {
    var DOM;
    elementTree = document.querySelector('element-tree');
    // objectTree shows the properties of a selected element in the tree
    objectTree = document.querySelector('object-tree#main-tree');
    // modelTree shows the model behind a seleccted element (if any)
    modelTree = document.querySelector('object-tree#model-tree');
    // methodList is the list of methods of the selected element. It is used
    // to add breakpoints
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
        },
        {
          name: 'setBreakpoint',
          string: setBreakpoint.toString()
        },
        {
          name: 'clearBreakpoint',
          string: clearBreakpoint.toString()
        },
        {
          name: 'filterProperty',
          string: filterProperty.toString()
        },
        {
          name: 'setBlacklist',
          string: setBlacklist.toString()
        },
        {
          name: 'isPolymerElement',
          string: isPolymerElement.toString()
        },
        {
          name: 'processMutations',
          string: processMutations.toString()
        },
        {
          name: 'inspectorSelectionChangeListener',
          string: inspectorSelectionChangeListener.toString()
        }/*,
        {
          name: 'addElementSelectionCSS',
          string: addElementSelectionCSS.toString()
        }*/
      ], function (result, error) {
        EvalHelper.executeFunction('setBlacklist', [], function (result, error) {
          if (error) {
            throw error;
          }
          EvalHelper.executeFunction('createCache', [], function (result, error) {
            if (error) {
              throw error;
            }
            EvalHelper.executeFunction('getDOMString', [], function (result, error) {
              DOM = JSON.parse(result.data);
              elementTree.initFromDOMTree(DOM);
            });
          });
        });
      });
    });
  }

  /**
  * Highlight an element in the page
  * isHover: true if element is to be highlighted because it was hovered
  * over in the element-tree.
  */
  function highlightElement (key, isHover) {
    EvalHelper.executeFunction('highlight', [key, isHover], function (result, error) {
      if (error) {
        throw error;
      }
    });
    EvalHelper.executeFunction('scrollIntoView', [key], function (result, error) {
      if (error) {
        console.log(error);
      }
    });
  }

  /**
  * Unhighlight a highlighted element in the page
  * isHover: true if element is to be unhighlighted because it was hovered
  * out in the element-tree.
  */
  function unhighlightElement (key, isHover) {
    EvalHelper.executeFunction('unhighlight', [key, isHover], function (result, error) {
      if (error) {
        throw error;
      }
    });
  }

  /**
  * isModel tells if it is model-tree that we are expanding
  */
  function expandObject (path, isModel) {
    var key = elementTree.selectedChild.key;
    EvalHelper.executeFunction('getObjectString', [key, path, isModel], function (result, error) {
      var props = JSON.parse(result.data).value;
      var childTree = isModel ? modelTree.tree : objectTree.tree;
      for (var i = 0; i < path.length; i++) {
        childTree = childTree[path[i]].value;
      }
      childTree.push.apply(childTree, props);
      if (!isModel && path.length === 0) {
        methodList.list = objectTree.tree;
      }
      EvalHelper.executeFunction('addObjectObserver', [key, path, isModel], function (result, error) {
        if (error) {
          throw error;
        }
      });
    });
  }

  function selectElement (key) {
    // When an element is selected, we try to open both the main and model trees
    expandObject([], false);
    expandObject([], true);
    // Visually highlight the element in the page and scroll it into view
    highlightElement(key);
  }
  function unselectElement (key, callback) {
    function removeObject (isModel, callback) {
      EvalHelper.executeFunction('removeObjectObserver', [key, [], isModel], function (result, error) {
        if (error) {
          throw error;
        }
        EvalHelper.executeFunction('emptyIndexMap', [key, [], isModel], function (result, error) {
          if (error) {
            throw error;
          }
          // Empty the object/model tree
          if (!isModel) {
            objectTree.tree.length = 0;
            var parent = methodList.parentNode;
            parent.removeChild(methodList);
            methodList = new MethodList();
            parent.appendChild(methodList);
            unhighlightElement(key, false);
          } else {
            modelTree.tree.length = 0;
          }

          callback && callback();
        });
      });
    }
    // First remove everything associated with the actual object
    removeObject(false, function () {
      // Then remove everything associated with the model
      removeObject(true, callback);
    });
  }
  /**
  * Refresh a property (*an accessor only*)
  * isModel tells if this is with regard to the model tree
  */
  function refreshProperty (key, childTree, path, isModel) {
    var index = path[path.length - 1];
    EvalHelper.executeFunction('getProperty', [key, path, isModel], function (result, error) {
      var newObj = JSON.parse(result).value[0];
      childTree[index] = newObj;
    });
  }
  window.addEventListener('polymer-ready', function () {
    init();
    // When an element in the element-tree is selected
    window.addEventListener('selected', function (event) {
      var key = event.detail.key;
      if (event.detail.oldKey) {
        unselectElement(event.detail.oldKey, function () {
          selectElement(key);
        });
      } else {
        selectElement(key);
      }
    });
    // When an element in the element-tree is unselected
    window.addEventListener('unselected', function (event) {
      var key = event.detail.key;
      unselectElement(key);
    });
    // When a property in the object-tree changes
    window.addEventListener('property-changed', function (event) {
      var newValue = event.detail.value;
      var path = event.detail.path;
      var key = elementTree.selectedChild.key;
      var childTree = event.detail.tree;
      var isModel = (event.target.id === 'model-tree');
      // Reflect a change in property in the host page
      EvalHelper.executeFunction('changeProperty', [key, path, newValue, isModel],
        function (result, error) {
          if (error) {
            throw error;
          }
          if (event.detail.reEval) {
            // The property requires a re-eval because it is accessor
            // and O.o() won't update it.
            refreshProperty(key, childTree, path, isModel);
          }
        }
      );
    });
    window.addEventListener('refresh-property', function (event) {
      var key = elementTree.selectedChild.key;
      var childTree = event.detail.tree;
      var path = event.detail.path;
      var isModel = (event.target.id === 'model-tree');
      refreshProperty(key, childTree, path, isModel);
    });
    window.addEventListener('object-expand', function (event) {
      var isModel = (event.target.id === 'model-tree');
      expandObject(event.detail.path, isModel);
    });
    // An object has been collapsed. We must remove the object observer
    // and empty the index-propName map in the host page for this object
    window.addEventListener('object-collapse', function (event) {
      var key = elementTree.selectedChild.key;
      var path = event.detail.path;
      var isModel = (event.target.id === 'model-tree');
      EvalHelper.executeFunction('removeObjectObserver', [key, path, isModel], function (result, error) {
        if (error) {
          throw error;
        }
        EvalHelper.executeFunction('emptyIndexMap', [key, path, isModel], function (result, error) {
          if (error) {
            throw error;
          }
        });
      });
    });
    window.addEventListener('breakpoint-toggle', function (event) {
      var key = elementTree.selectedChild.key;
      var index = event.detail.index;
      var functionName = event.detail.isSet ? 'setBreakpoint' : 'clearBreakpoint';
      EvalHelper.executeFunction(functionName, [key, [index]], function (result, error) {
        if (error) {
          throw error;
        }
      });
    });
    // Happens when an element is hovered over
    window.addEventListener('highlight', function (event) {
      var key = event.detail.key;
      highlightElement(key, true);
    });
    // Happens when an element is hovered out
    window.addEventListener('unhighlight', function (event) {
      var key = event.detail.key;
      unhighlightElement(key, true);
    });

    var backgroundPageConnection = chrome.runtime.connect({
      name: 'panel'
    });
    backgroundPageConnection.onMessage.addListener(function (message, sender, sendResponse) {
      switch (message.name) {
        case 'refresh':
          // A page refresh has happened
          init();
          break;
        case 'object-changed':
          // An object has changed. Must update object-tree

          // The list of changes
          var changeObj = JSON.parse(message.changeList);
          // The path where the change happened
          var path = changeObj.path;
          var changes = changeObj.changes;
          var isModel = changeObj.isModel;
          for (var i = 0; i < changes.length; i++) {
            var change = changes[i];
            var type = change.type;
            // Index refers to the index in object-tree corresponding to the property
            var index = change.index;
            // Name refers to the actual property name
            var name = change.name;
            // This is a wrapped object. `value` contains the actual object.
            var newObj;
            var childTree = isModel ? modelTree.tree : objectTree.tree;
            try {
              // If the observer reports changes before child-tree is ready, we must
              // only
              for (var j = 0; j < path.length; j++) {
                childTree = childTree[path[j]].value;
              }
            } catch (e) {
              // TODO: is it okay to do this busy looping until child-tree is ready?
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
          break;
        case 'dom-mutation':
          // A DOM element has changed. Must re-render it in the element tree.
          
          var mutations = JSON.parse(message.changeList);
          for (var i = 0; i < mutations.length; i++) {
            var newElement = JSON.parse(mutations[i].data);
            var key = newElement.key;
            var childTree = elementTree.getChildTreeForKey(key);
            if (childTree.selected) {
              unselectElement(childTree.key, function () {
                childTree.empty();
                childTree.initFromDOMTree(newElement);
              });
            } else {
              childTree.empty();
              childTree.initFromDOMTree(newElement);
            }
          }
          break;
        case 'inspected-element-changed':
        // An element got selected in the inspector, must select in element-tree
          var childTree = elementTree.getChildTreeForKey(message.key);
          if (!childTree.selected) {
            childTree.toggleSelection();
          }
          break;
      }
    });
    
    // Send a message to background page so that the background page can associate panel
    // to the current host page
    backgroundPageConnection.postMessage({
      name: 'panel-init',
      tabId: chrome.devtools.inspectedWindow.tabId
    });

    // When an element selection changes in the inspector, we try to update the new pane with
    // the same element selected
    chrome.devtools.panels.elements.onSelectionChanged.addListener(function () {
      EvalHelper.executeFunction('inspectorSelectionChangeListener', [], function (result, error) {
        if (error) {
          console.log(error);
        }
      });
    });
  });
})();
