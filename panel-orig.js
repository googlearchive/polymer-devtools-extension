(function() {
  // elementTree is the tree used for viewing composed DOM.
  // It is initialized once and its branches are kept up-to-date as necessary.
  var elementTree;

  // localDOMTree is the tree used for viewing local DOM contents
  var localDOMTree;

  // Object-tree is the object tree in the right pane.
  var objectTree;

  // The bread crumbs that are shown in the local DOM view
  var breadCrumbs;

  // For breakpoints
  var methodList;

  var splitPane;

  // Loading bars
  var composedTreeLoadingBar;
  var localDOMTreeLoadingBar;

  // For injecting code into the host page
  var EvalHelper;

  // Last scroll position of the element tree.
  var elementTreeScrollTop;

  // localDOMMode is true when we're viewing the local DOM element tree
  var localDOMMode = false;

  // deepView is true when the local DOM tree is showing the shadow DOM contents,
  // false when showing the light DOM contents
  var deepView = false;

  // If the page had DOM mutations while the tree was being rendered, we need
  // to account for those later.
  var pendingDOMMutations = [];

  // If the page has a pending refresh while the tree was being rendered.
  var pendingRefresh = false;

  // isTreeLoading is set to true when the tree is being loaded (upon init or
  // DOM mutations)
  var isTreeLoading = false;

  /**
   * Called when the panel has to re-init itself upon host page reload/change.
   */
  function createPageView() {
    pendingRefresh = false;
    // Create an EvalHelper object that will help us interact with host page
    // via `eval` calls.
    createEvalHelper(function(helper) {
      EvalHelper = helper;
      // Make all the definitions in the host page
      EvalHelper.defineFunctions([{
        name: 'highlight',
        string: highlight.toString()
      }, {
        name: 'unhighlight',
        string: unhighlight.toString()
      }, {
        name: 'scrollIntoView',
        string: scrollIntoView.toString()
      }, {
        name: 'changeProperty',
        string: changeProperty.toString()
      }, {
        name: 'getProperty',
        string: getProperty.toString()
      }, {
        name: 'resolveObject',
        string: resolveObject.toString()
      }, {
        name: 'addObjectObserver',
        string: addObjectObserver.toString()
      }, {
        name: 'removeObjectObserver',
        string: removeObjectObserver.toString()
      }, {
        name: 'createCache',
        string: createCache.toString()
      }, {
        name: 'addToCache',
        string: addToCache.toString()
      }, {
        name: 'getPropPath',
        string: getPropPath.toString()
      }, {
        name: 'getIndexMapObject',
        string: getIndexMapObject.toString()
      }, {
        name: 'addToSubIndexMap',
        string: addToSubIndexMap.toString()
      }, {
        name: 'emptySubIndexMap',
        string: emptySubIndexMap.toString()
      }, {
        name: 'removeFromSubIndexMap',
        string: removeFromSubIndexMap.toString()
      }, {
        name: 'DOMJSONizer',
        string: DOMJSONizer.toString()
      }, {
        name: 'getObjectJSON',
        string: getObjectJSON.toString()
      }, {
        name: 'getDOMJSON',
        string: getDOMJSON.toString()
      }, {
        name: 'setBreakpoint',
        string: setBreakpoint.toString()
      }, {
        name: 'clearBreakpoint',
        string: clearBreakpoint.toString()
      }, {
        name: 'filterProperty',
        string: filterProperty.toString()
      }, {
        name: 'setBlacklist',
        string: setBlacklist.toString()
      }, {
        name: 'isPolymerElement',
        string: isPolymerElement.toString()
      }, {
        name: 'processMutations',
        string: processMutations.toString()
      }, {
        name: 'inspectorSelectionChangeListener',
        string: inspectorSelectionChangeListener.toString()
      }, {
        name: 'getNamespacedEventName',
        string: getNamespacedEventName.toString()
      }, {
        name: 'isPageFresh',
        string: isPageFresh.toString()
      }, {
        name: 'reloadPage',
        string: reloadPage.toString()
      }], function(result, error) {
        // Set the blacklist static property on `filterProperty`
        EvalHelper.executeFunction('setBlacklist', [], function(result, error) {
          if (error) {
            throw error;
          }
          EvalHelper.executeFunction('createCache', [], function(result, error) {
            if (error) {
              throw error;
            }
            EvalHelper.executeFunction('getDOMJSON', [], function(result, error) {
              if (error) {
                throw error;
              }
              // Reset object-trees and bread-crumbs
              objectTree.tree.length = 0;
              modelTree.tree.length = 0;
              breadCrumbs.list.length = 0;
              // Load element-trees
              var DOM = result.data;
              console.log('loading composed DOM tree');
              // Load the composed DOM tree
              doTreeLoad(function() {
                elementTree.initFromDOMTree(DOM, true);
              });
              console.log('loading local DOM tree');
              // Load the local DOM tree
              initLocalDOMTree(localDOMTree, DOM);
              breadCrumbs.list.push({
                name: DOM.tagName,
                key: DOM.key
              });
              doPendingActions();
            });
          });
        });
      });
    });
  }

  /**
   * Called when panel is opened or page is refreshed.
   */
  function init() {
    elementTree = document.querySelector('element-tree#composedDOMTree');
    localDOMTree = document.querySelector('element-tree#localDOMTree');

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

    composedTreeLoadingBar = document.querySelector('#composedTreeLoadingBar');
    localDOMTreeLoadingBar = document.querySelector('#localDOMTreeLoadingBar');

    // tabs is a reference to the paper-tabs that is used to change the object-tree
    // shown in view
    var tabs = document.querySelector('#tabs');
    var objectTreePages = document.querySelector('#objectTreePages');
    tabs.addEventListener('core-select', function(event) {
      objectTreePages.selected = tabs.selected;
    });

    // toggleButton is an instance of paper-toggle-button used to switch between
    // composed DOM and local DOM views
    var toggleButton = document.querySelector('#toggleButton');
    var elementTreePages = document.querySelector('#elementTreePages');
    toggleButton.addEventListener('change', function(event) {
      // Unselect whatever is selected in whichever element-tree
      unSelectInTree();
      splitPane.leftScrollTop = elementTreeScrollTop;
      elementTreePages.selected = toggleButton.checked ? 1 : 0;
      localDOMMode = toggleButton.checked;
    });

    // When the reload button is clicked.
    document.querySelector('#reloadPage').addEventListener('click', function (event) {
      EvalHelper.executeFunction('reloadPage', function (result, error) {
        if (error) {
          throw error;
        }
      });
    });
    createPageView();
  }

  /**
   * Sets the loading state and loading sign while the tree is rendered and
   * resets them back when done.
   * @param  {Function} callback       called when loading state is set
   * @param  {Boolean}  isLocalDOMTree if it is the local DOM tree that is being rendered
   */
  function doTreeLoad(callback, isLocalDOMTree) {
    isTreeLoading = true;
    var loadingBar = isLocalDOMTree ? localDOMTreeLoadingBar : composedTreeLoadingBar;
    var tree = isLocalDOMTree ? localDOMTree : elementTree;
    loadingBar.style.display = 'block';
    tree.style.display = 'none';
    if (isLocalDOMTree) {
      breadCrumbs.style.display = 'none';
    }
    callback();
    loadingBar.style.display = 'none';
    tree.style.display = 'block';
    if (isLocalDOMTree) {
      breadCrumbs.style.display = 'block';
    }
    isTreeLoading = false;
  }

  /**
   * Initializes the element tree in the local DOM view with the DOM tree supplied.
   * It checks `deepView` and decides how to display the DOM tree (i.e., light DOM or shadow DOM).
   * @param  {Object} tree either localDOMTree or a sub-tree of it to be rendered.
   * @param  {Object} DOM  The DOM object or part of it extracted from the page.
   */
  function initLocalDOMTree(tree, DOM) {
    doTreeLoad(function() {
      if (!deepView) {
        // DOM tree is to be shown as light DOM tree
        if (tree === localDOMTree) {
          tree.initFromDOMTree(DOM.lightDOMTree, true);
        } else {
          tree.initFromDOMTree(DOM.lightDOMTree, true, localDOMTree);
        }
      } else if (tree === localDOMTree) {
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
        if (!DOM.noShadowRoot) {
          // if the tree object didn't contain this flag it would have meant that this element
          // doesn't have a shadow root and shouldn't have a shadow DOM view
          var childTree;
          for (var i = 0; i < DOM.children.length; i++) {
            childTree = new ElementTree();
            childTree.initFromDOMTree(DOM.children[i].lightDOMTree, true, localDOMTree);
            tree.addChild(childTree);
          }
        }
      } else {
        // called when DOM mutations happen and we need update just one part of the tree
        tree.initFromDOMTree(DOM.lightDOMTree, true);
      }
    }, true);
  }

  /**
   * Gets the currently selected element's key in whichever view
   * @return {Number} The key
   */
  function getCurrentElementTreeKey() {
    if (localDOMMode) {
      return localDOMTree.selectedChild ? localDOMTree.selectedChild.key : null;
    }
    return elementTree.selectedChild ? elementTree.selectedChild.key : null;
  }

  /**
   * Gets the currently focused element tree
   * @return {ElementTree} Either the composed DOM tree or localDOMTree
   */
  function getCurrentElementTree() {
    if (localDOMMode) {
      return localDOMTree;
    }
    return elementTree;
  }

  /**
   * Unselect the selected element in whichever tree
   */
  function unSelectInTree() {
    var selectedKey = getCurrentElementTreeKey();
    if (selectedKey) {
      var childTree = getCurrentElementTree().selectedChild;
      childTree.toggleSelection();
    }
  }

  /**
   * Switch to local DOM view if we're not in it
   */
  function switchToLocalDOMView() {
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
   * @param  {Number}      key The key of the DOM element
   * @return {HTMLElement}     The element corresponding to key.
   */
  function getDOMTreeForKey(key) {
    var childTree = elementTree.getChildTreeForKey(key);
    return childTree ? childTree.tree : null;
  }

  /**
   * Highlight an element in the page
   * @param  {Number}  key     The key of the element to be highlighted
   * @param  {Boolean} isHover If it is a hover and not a selection
   */
  function highlightElement(key, isHover) {
    EvalHelper.executeFunction('highlight', [key, isHover], function(result, error) {
      if (error) {
        throw error;
      }
    });
    EvalHelper.executeFunction('scrollIntoView', [key], function(result, error) {
      if (error) {
        console.log(error);
      }
    });
  }

  /**
   * Unhighlight a highlighted element in the page
   * @param  {Number}  key     Key of the element to be unhighlighted
   * @param  {Boolean} isHover If it is because of a hover-out and not an unselection.
   */
  function unhighlightElement(key, isHover) {
    EvalHelper.executeFunction('unhighlight', [key, isHover], function(result, error) {
      if (error) {
        throw error;
      }
    });
  }

  /**
   * Expands an object in either of the object-trees and adds O.o() listeners.
   * @param  {Number}  key     Key of the element whose object is to be expanded.
   * @param  {Array}   path    An array representing the path to find the expansion point.
   * @param  {Boolean} isModel If it is the model-tree we're trying to expand.
   */
  function expandObject(key, path, isModel) {
    EvalHelper.executeFunction('getObjectJSON', [key, path, isModel], function(result, error) {
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
      EvalHelper.executeFunction('addObjectObserver', [key, path, isModel], function(result, error) {
        if (error) {
          throw error;
        }
      });
    });
  }

  /**
   * Selects an element = expands Object-tree and highlights in page
   * @param  {Number} key Key of element to expand.
   */
  function selectElement(key) {
    // When an element is selected, we try to open both the main and model trees
    expandObject(key, [], false);
    expandObject(key, [], true);
    // Visually highlight the element in the page and scroll it into view
    highlightElement(key);
  }

  /**
   * Unselects an element = removes O.o() listeners and empties index map.
   * @param  {Number}   key      Key of the unselected element.
   * @param  {Function} callback Called when everything is done.
   */
  function unselectElement(key, callback) {
    function removeObject(isModel, callback) {
      EvalHelper.executeFunction('removeObjectObserver', [key, [], isModel], function(result, error) {
        if (error) {
          throw error;
        }
        EvalHelper.executeFunction('emptySubIndexMap', [key, [], isModel], function(result, error) {
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
    removeObject(false, function() {
      // Then remove everything associated with the model
      removeObject(true, callback);
    });
  }

  /**
   * Refresh an accessor property.
   * @param  {Number}      key       Key of the element concerned.
   * @param  {ObjectTree}  childTree The sub-object-tree where this property is rendered.
   * @param  {Array}       path      Path to find the property.
   * @param  {Boolean}     isModel   If the property belongs to the model-tree.
   */
  function refreshProperty(key, childTree, path, isModel) {
    var index = path[path.length - 1];
    EvalHelper.executeFunction('getProperty', [key, path, isModel], function(result, error) {
      var newObj = result.value[0];
      childTree[index] = newObj;
    });
  }

  /**
   * Processes DOM mutations. i.e., updates trees with pending DOM mutations.
   */
  function addMutations() {
    var mutations = pendingDOMMutations.slice(0);
    pendingDOMMutations.length = 0;
    for (var i = 0; i < mutations.length; i++) {
      var newElement = mutations[i].data;
      var key = newElement.key;
      var childElementTree = elementTree.getChildTreeForKey(key);
      var childLocalDOMTree = localDOMTree.getChildTreeForKey(key);

      function resetTree() {
        // elementTree has all composed DOM elements. A DOM mutation will might need
        // an update there
        if (childElementTree) {
          doTreeLoad(function() {
            childElementTree.initFromDOMTree(newElement, true, elementTree);
          });
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
    if (pendingDOMMutations.length > 0) {
      doPendingActions();
    }
  }

  /**
   * Do pending stuff (page reloads or DOM mutations) that happened while trees were
   * being rendered.
   */
  function doPendingActions() {
    if (pendingRefresh) {
      createPageView();
    } else {
      addMutations();
    }
  }
  // When the panel is opened
  window.addEventListener('polymer-ready', function() {
    init();

    // When an element in the element-tree is selected
    window.addEventListener('selected', function(event) {
      var key = event.detail.key;
      if (event.detail.oldKey) {
        unselectElement(event.detail.oldKey, function() {
          selectElement(key);
        });
      } else {
        selectElement(key);
      }
    });

    // When an element in the element-tree is unselected
    window.addEventListener('unselected', function(event) {
      var key = event.detail.key;
      unselectElement(key);
    });

    // When a property in the object-tree changes
    window.addEventListener('property-changed', function(event) {
      var newValue = event.detail.value;
      var path = event.detail.path;
      var key = getCurrentElementTreeKey();
      var childTree = event.detail.tree;
      var isModel = (event.target.id === 'model-tree');
      // Reflect a change in property in the host page
      EvalHelper.executeFunction('changeProperty', [key, path, newValue, isModel],
        function(result, error) {
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

    // When the refresh button is clicked in the object-trees.
    window.addEventListener('refresh-property', function(event) {
      var key = getCurrentElementTreeKey();
      var childTree = event.detail.tree;
      var path = event.detail.path;
      var isModel = (event.target.id === 'model-tree');
      refreshProperty(key, childTree, path, isModel);
    });

    // When an object is expanded.
    window.addEventListener('object-expand', function(event) {
      var isModel = (event.target.id === 'model-tree');
      var key = getCurrentElementTreeKey();
      expandObject(key, event.detail.path, isModel);
    });

    // An object has been collapsed. We must remove the object observer
    // and empty the index-propName map in the host page for this object
    window.addEventListener('object-collapse', function(event) {
      var key = getCurrentElementTreeKey();
      var path = event.detail.path;
      var isModel = (event.target.id === 'model-tree');
      EvalHelper.executeFunction('removeObjectObserver', [key, path, isModel], function(result, error) {
        if (error) {
          throw error;
        }
        EvalHelper.executeFunction('emptySubIndexMap', [key, path, isModel], function(result, error) {
          if (error) {
            throw error;
          }
        });
      });
    });

    // When a breakpoint is added/removed.
    window.addEventListener('breakpoint-toggle', function(event) {
      var key = getCurrentElementTreeKey();
      var index = event.detail.index;
      var functionName = event.detail.isSet ? 'setBreakpoint' : 'clearBreakpoint';
      EvalHelper.executeFunction(functionName, [key, [index]], function(result, error) {
        if (error) {
          throw error;
        }
      });
    });

    // Happens when an element is hovered over
    window.addEventListener('highlight', function(event) {
      var key = event.detail.key;
      highlightElement(key, true);
    });

    // Happens when an element is hovered out
    window.addEventListener('unhighlight', function(event) {
      var key = event.detail.key;
      unhighlightElement(key, true);
    });

    // Happens when an element is to be magnified,
    // i.e., either seen in the local DOM view or if already in the 
    // local DOM view, to see the shadow content of it.
    window.addEventListener('magnify', function(event) {
      var key = event.detail.key;
      var childTree = getCurrentElementTree().getChildTreeForKey(key);
      if (!localDOMMode) {
        var DOMTree = getDOMTreeForKey(key);
        unSelectInTree();
        deepView = false;
        breadCrumbs.list = [{
          name: DOMTree.tagName,
          key: DOMTree.key
        }];
        initLocalDOMTree(localDOMTree, DOMTree);
        switchToLocalDOMView();
      } else {
        deepView = true;
        var DOMTree = getDOMTreeForKey(key);
        unSelectInTree();
        // If the last bread crumb is not the one representing what we want in the
        // local DOM view (this means it is not just a peek into the shadow DOM from light DOM)
        if (breadCrumbs.list[breadCrumbs.list.length - 1].key !== DOMTree.key) {
          breadCrumbs.list.push({
            name: DOMTree.tagName,
            key: DOMTree.key
          });
        }
        initLocalDOMTree(localDOMTree, DOMTree);
      }
      doPendingActions();
    });

    // When an element in the local DOM view is to be 'unmagnified',
    // i.e., its light DOM is to be seen.
    window.addEventListener('unmagnify', function(event) {
      // Only possible inside local DOM view and when in deepView
      var key = event.detail.key;
      var childTree = getCurrentElementTree().getChildTreeForKey(key);
      deepView = false;
      var DOMTree = childTree.tree;
      unSelectInTree();
      initLocalDOMTree(localDOMTree, DOMTree);
      doPendingActions();
    });

    // When a bread crumb click happens we may need to focus something else in
    // tree
    window.addEventListener('bread-crumb-click', function(event) {
      unSelectInTree();
      var key = event.detail.key;
      var DOMTree = getDOMTreeForKey(key);
      deepView = false;
      initLocalDOMTree(localDOMTree, DOMTree);
      doPendingActions();
    });

    // When a Polymer element's definition is to be viewed.
    window.addEventListener('view-source', function(event) {
      var key = event.detail.key;
      var DOMTree = getDOMTreeForKey(key);
      var sourceURL = DOMTree.sourceURL;
      // TODO: Is there any way to find the exact line and column of definition of
      // a Polymer element?
      chrome.devtools.panels.openResource(sourceURL, 1, 1);
    });

    var backgroundPageConnection = chrome.runtime.connect({
      name: 'panel'
    });
    // All these messages come from the background page and not from the UI of the extension.
    backgroundPageConnection.onMessage.addListener(function(message, sender, sendResponse) {
      switch (message.name) {
        case 'check-page-fresh':
          // The page's location has changed. This doesn't necessarily mean that
          // the page itself got reloaded. So we try to execute a function which is supposed
          // to be defined if the page is not fresh. If it fails, then the page is fresh.
          EvalHelper.executeFunction('isPageFresh', [], function(result, error) {
            if (error) {
              // The page is fresh.
              // Check if this is a Polymer page.
              chrome.devtools.inspectedWindow.eval('Polymer', function (result, error) {
                // Boolean(error) tells if this was a Polymer page.
                // Let the background page know so it can spawn the content script.
                // Expect a 'refresh' message after that.
                backgroundPageConnection.postMessage({
                  name: 'fresh-page',
                  tabId: chrome.devtools.inspectedWindow.tabId,
                  isPolymerPage: Boolean(error)
                });
              });
            }
          });
          break;
        case 'refresh':
          // This happens when the page actually got reloaded.
          if (isTreeLoading) {
            // We don't want to trigger another init process starting if the extension UI
            // is still trying to get set up. We just mark it so it can processed afterwards.
            pendingRefresh = true;
            // No use processing DOM mutations of older page.
            pendingDOMMutations.length = 0;
          } else {
            createPageView();
          }
          break;
        case 'object-changed':
          // An object has changed. Must update the object-trees

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
          pendingDOMMutations.push.apply(pendingDOMMutations, mutations);
          if (!isTreeLoading) {
            addMutations();
          }
          break;
        case 'inspected-element-changed':
          if (localDOMMode) {
            return;
          }
          // An element got selected in the inspector, must select in composed DOM tree
          var childTree = elementTree.getChildTreeForKey(message.key);
          if (childTree && !childTree.selected) {
            childTree.toggleSelection();
            childTree.scrollIntoView();
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
    chrome.devtools.panels.elements.onSelectionChanged.addListener(function() {
      EvalHelper.executeFunction('inspectorSelectionChangeListener', [], function(result, error) {
        if (error) {
          console.log(error);
        }
      });
    });
  });
})();
