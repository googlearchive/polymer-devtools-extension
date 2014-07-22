(function () {
  // elementTree is the tree used for viewing composed DOM.
  // It is initialized once and its branches are kept up-to-date as necessary.
  var elementTree;
  // shadowDOMTree is the tree used for viewing local DOM contents
  var shadowDOMTree;
  var objectTree;
  // For breakpoints
  var methodList;
  // For injecting code into the host page
  var EvalHelper;
  var splitPane;
  // The bread crumbs that are shown in the local DOM view
  var breadCrumbs;
  var elementTreeScrollTop;
  // localDOMMode is true when we're viewing the local DOM element tree
  var localDOMMode = false;
  // deepView is true when the local DOM view is showing the shadow DOM contents,
  // false when showing the light DOM contents
  var deepView = false;
  function init () {
    var DOM;
    elementTree = document.querySelector('element-tree#composedDOMTree');
    shadowDOMTree = document.querySelector('element-tree#shadowDOMTree');
    // objectTree shows the properties of a selected element in the tree
    objectTree = document.querySelector('object-tree#main-tree');
    // modelTree shows the model behind a seleccted element (if any)
    modelTree = document.querySelector('object-tree#model-tree');
    // methodList is the list of methods of the selected element. It is used
    // to add breakpoints
    methodList = document.querySelector('method-list');

    splitPane = document.querySelector('split-pane');
    breadCrumbs = document.querySelector('bread-crumbs');
    breadCrumbs.list = [];

    // tabs is an instance of paper-tabs that is used to change the object-tree
    // shown in view
    var tabs = document.querySelector('#tabs');
    var objectTreePages = document.querySelector('#objectTreePages');
    tabs.addEventListener('core-select', function (event) {
      objectTreePages.selected = tabs.selected;
    });
    // toggleButton is an instance of paper-toggle-button used to switch between
    // composed DOM and local DOM views
    var toggleButton = document.querySelector('#toggleButton');
    var elementTreePages = document.querySelector('#elementTreePages');
    toggleButton.addEventListener('change', function (event) {
      // Unselect whatever is selected in whichever element-tree
      unSelectInTree();
      splitPane.leftScrollTop = elementTreeScrollTop;
      elementTreePages.selected = toggleButton.checked ? 1 : 0;
      localDOMMode = toggleButton.checked;
    });
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
          name: 'DOMJSONizer',
          string: DOMJSONizer.toString()
        },
        {
          name: 'getObjectJSON',
          string: getObjectJSON.toString()
        },
        {
          name: 'getDOMJSON',
          string: getDOMJSON.toString()
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
        },
        {
          name: 'getNamespacedEventName',
          string: getNamespacedEventName.toString()
        },
        {
          name: 'isPageFresh',
          string: isPageFresh.toString()
        }
      ], function (result, error) {
        EvalHelper.executeFunction('setBlacklist', [], function (result, error) {
          if (error) {
            throw error;
          }
          EvalHelper.executeFunction('createCache', [], function (result, error) {
            if (error) {
              throw error;
            }
            EvalHelper.executeFunction('getDOMJSON', [], function (result, error) {
              if (error) {
                throw error;
              }
              console.log('1');
              DOM = result.data;
              console.log('2');
              elementTree.initFromDOMTree(DOM, true);
              console.log('3');
              initLocalDOMTree(shadowDOMTree, DOM);
              breadCrumbs.list.push({
                name: DOM.tagName,
                key: DOM.key
              });
              console.log('4');
            });
          });
        });
      });
    });
  }

  /**
  * Initializes the element tree in the local DOM view with the DOM tree supplied.
  * It checks `deepView` and decides how to display the DOM tree (i.e., light DOM or shadow DOM).
  */
  function initLocalDOMTree (tree, DOM) {
    if (!deepView) {
      // DOM tree is to be shown as light DOM tree
      if (tree === shadowDOMTree) {
        tree.initFromDOMTree(DOM.lightDOMTree, true);
      } else {
        tree.initFromDOMTree(DOM.lightDOMTree, true, shadowDOMTree);
      }
      return;
    }
    if (tree === shadowDOMTree) {
      // We are trying to set the entire tree here.
      // It is done this way:
      // 1. First level of children are from the composed DOM
      // 2. After that all children of first level children are from light DOM
      var treeRoot = {
        tagName: DOM.tagName,
        key: DOM.key,
        children: [],
        isPolymer: DOM.isPolymer
      };
      tree.initFromDOMTree(treeRoot, false);
      tree.tree = DOM;
      if (DOM.noShadowRoot) {
        // the tree object contains this flag that means that this element
        // doesn't have a shadow root and shouldn't have a shadow DOM view
        return;
      }
      var childTree;
      for (var i = 0; i < DOM.children.length; i++) {
        childTree = new ElementTree();
        childTree.initFromDOMTree(DOM.children[i].lightDOMTree, true, shadowDOMTree);
        tree.addChild(childTree);
      }

    } else {
      // called when DOM mutations happen and we need update just one part of the tree
      tree.initFromDOMTree(DOM.lightDOMTree, true);
    }
  }

  /**
  * Gets the currently selected element's key in whichever view
  */
  function getCurrentElementTreeKey () {
    if (localDOMMode) {
      return shadowDOMTree.selectedChild ? shadowDOMTree.selectedChild.key : null;
    }
    return elementTree.selectedChild ? elementTree.selectedChild.key : null;
  }

  /**
  * Gets the currently focused element tree
  */
  function getCurrentElementTree () {
    if (localDOMMode) {
      return shadowDOMTree;
    }
    return elementTree;
  }

  /**
  * Unselect the selected element in whichever tree
  */
  function unSelectInTree () {
    var selectedKey = getCurrentElementTreeKey();
    if (selectedKey) {
      var childTree = getCurrentElementTree().selectedChild;
      childTree.toggleSelection();
    }
  }

  /**
  * Switch to local DOM view if we're not in it
  */
  function switchToLocalDOMView () {
    if (localDOMMode) {
      return;
    }
    unSelectInTree();
    elementTreeScrollTop = splitPane.leftScrollTop;
    elementTreePages.selected = 1;
    localDOMMode = true;
    toggleButton.checked = true;
    splitPane.rightScrollTop = 0;
  }

  /**
  * elementTree has references to all rendered elements. So if someother
  * part of the code wants a reference to a DOM element we can just get it from
  * elementTree. It is an alternative to a separate hash table which would have
  * needed another complete tree traversal.
  */
  function getDOMTreeForKey (key) {
    var childTree = elementTree.getChildTreeForKey(key);
    return childTree ? childTree.tree : null;
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
  function expandObject (key, path, isModel) {
    EvalHelper.executeFunction('getObjectJSON', [key, path, isModel], function (result, error) {
      if (error) {
        throw error;
      }
      var props = result.data.value;
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
    expandObject(key, [], false);
    expandObject(key, [], true);
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
      var newObj = result.value[0];
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
      var key = getCurrentElementTreeKey();
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
      var key = getCurrentElementTreeKey();
      var childTree = event.detail.tree;
      var path = event.detail.path;
      var isModel = (event.target.id === 'model-tree');
      refreshProperty(key, childTree, path, isModel);
    });
    window.addEventListener('object-expand', function (event) {
      var isModel = (event.target.id === 'model-tree');
      var key = getCurrentElementTreeKey();
      expandObject(key, event.detail.path, isModel);
    });
    // An object has been collapsed. We must remove the object observer
    // and empty the index-propName map in the host page for this object
    window.addEventListener('object-collapse', function (event) {
      var key = getCurrentElementTreeKey();
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
      var key = getCurrentElementTreeKey();
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

    // Happens when an element is to be magnified,
    // i.e., either seen in the local DOM view or if already in the 
    // local DOM view, to see the shadow content of it.
    window.addEventListener('magnify', function (event) {
      var key = event.detail.key;
      var childTree = getCurrentElementTree().getChildTreeForKey(key);
      if (!localDOMMode) {
        var DOMTree = getDOMTreeForKey(key);
        unSelectInTree();
        deepView = false;
        initLocalDOMTree(shadowDOMTree, DOMTree);
        breadCrumbs.list = [{
          name: DOMTree.tagName,
          key: DOMTree.key
        }];
        switchToLocalDOMView();
      } else {
        deepView = true;
        var DOMTree = getDOMTreeForKey(key);
        unSelectInTree();
        initLocalDOMTree(shadowDOMTree, DOMTree);
        // If the last bread crumb is not the one representing what we want in the
        // local DOM view (this means it is not just a peek into the shadow DOM from light DOM)
        if (breadCrumbs.list[breadCrumbs.list.length - 1].key !== DOMTree.key) {
          breadCrumbs.list.push({
            name: DOMTree.tagName,
            key: DOMTree.key
          });
        }
      }
    });

    // When an element in the local DOM view is to be 'unmagnified',
    // i.e., it's light DOM is to be seen.
    window.addEventListener('unmagnify', function (event) {
      // Only possible inside local DOM view and when in deepView
      var key = event.detail.key;
      var childTree = getCurrentElementTree().getChildTreeForKey(key);
      deepView = false;
      var DOMTree = childTree.tree;
      unSelectInTree();
      initLocalDOMTree(shadowDOMTree, DOMTree);
    });

    // When a bread crumb click happens we may need to focus something else in
    // tree
    window.addEventListener('bread-crumb-click', function (event) {
      unSelectInTree();
      var key = event.detail.key;
      var DOMTree = getDOMTreeForKey(key);
      deepView = false;
      initLocalDOMTree(shadowDOMTree, DOMTree);
    });

    var backgroundPageConnection = chrome.runtime.connect({
      name: 'panel'
    });
    backgroundPageConnection.onMessage.addListener(function (message, sender, sendResponse) {
      switch (message.name) {
        case 'check-page-fresh':
          // The page's location has changed. This doesn't necessarily mean that
          // the page itself got reloaded. So we try to execute a function which is supposed
          // to be defined if the page is not fresh. If it fails, then the page is fresh.
          EvalHelper.executeFunction('isPageFresh', [], function (result, error) {
            if (error) {
              // Let the background page know so it can spawn the content script.
              // Expect a 'refresh' message after that.
              backgroundPageConnection.postMessage({
                name: 'fresh-page',
                tabId: chrome.devtools.inspectedWindow.tabId
              });
            }
          });
          break;
        case 'refresh':
          // This happens when either:
          // 1. The page got upgraded by Polymer ('polymer-ready')
          // 2. The page got actually refreshed.
          EvalHelper.executeFunction('cleanUp', [], function (result, error) {
            // Ignore error. If this 'refresh' was due to a 'polymer-ready' event, cleanUp will
            // do its job. Otherwise it must be a fresh page, so there is no clean up needed.
            init();
          });
          break;
        case 'object-changed':
          // An object has changed. Must update object-tree

          // The list of changes
          var changeObj = message.changeList;
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
              // If the observer reports changes before child-tree is ready, we can
              // only wait and ignore it
              for (var j = 0; j < path.length; j++) {
                childTree = childTree[path[j]].value;
              }
            } catch (e) {
              // TODO: is it okay to do this busy looping until child-tree is ready?
            }
            if (type !== 'delete') {
              newObj = change.object.value[0];
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
          
          var mutations = message.changeList;
          for (var i = 0; i < mutations.length; i++) {
            var newElement = mutations[i].data;
            var key = newElement.key;
            var childElementTree = elementTree.getChildTreeForKey(key);
            var childLocalDOMTree = shadowDOMTree.getChildTreeForKey(key);
            function resetTree () {
              // elementTree has all composed DOM elements. A DOM mutation will might need
              // an update there
              if (childElementTree) {
                childElementTree.initFromDOMTree(newElement, true, elementTree);
              }
              if (childLocalDOMTree) {
                // The element to be refreshed is there in the local DOM tree as well.
                initLocalDOMTree(childLocalDOMTree, newElement);
              }
            }
            if ((childElementTree && childElementTree.selected) ||
              (childLocalDOMTree && childLocalDOMTree.selected)) {
              // The selected element and the one to be refreshed are the same.
              unselectElement(key, resetTree);
            } else {
              resetTree();
            }
          }
          break;
        case 'inspected-element-changed':
          // An element got selected in the inspector, must select in element-tree
          var tree = getCurrentElementTree();
          var childTree = tree.getChildTreeForKey(message.key);
          if (childTree && !childTree.selected) {
            childTree.toggleSelection();
          }
          childTree.scrollIntoView();
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
