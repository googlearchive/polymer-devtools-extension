// All these helpers are meant to be injected into the host page as strings
// after .toString().
// E.g, to define `highlight` a function which takes `NAMESPACE`
// as an argument and has a `window[<namspace>] = <highlight-function-string>;`
// in its body is self-executed in the context of the host page.
//
// If you add a new function, and wish for it to be exposed, you will also need
// to add it to `createPageView()` in `panel-orig.js`.

/**
 * Reloads the page.
 */
function reloadPage () {
  window.location.reload();
}

/**
 * Used to check if the page is fresh (untouched by the extension).
 * If it is defined in the page, then it won't raise an error. The page is considered unfresh.
 * If it goes through, the page is fresh.
 * (This is dummy function.)
 * @return {String}
 */
function isPageFresh() {
  return true;
}

/**
 * Adds the extension ID to the event name so its unique.
 * @param  {String} name name of event
 * @return {String}      new event name
 */
function getNamespacedEventName(name) {
  return NAMESPACE + '-' + name;
}

/**
 * Creates/updates an overlay at `rect`. Will replace the previous overlay at
 * `Overlays[index]` if it exists.
 * @param {!ClientRect} rect  rectangle to display a highlight over.
 * @param {Number}      index index of `Overlays` to reuse/set.
 */
function renderOverlay(rect, index) {
  var overlay = window[NAMESPACE].overlays[index];
  if (!overlay) {
    overlay = window[NAMESPACE].overlays[index] = document.createElement('div');
    document.body.appendChild(overlay);

    overlay.style.position        = 'absolute';
    overlay.style.backgroundColor = 'rgba(255, 64, 129, 0.5)';
    overlay.style.pointerEvents   = 'none';
    overlay.style.zIndex          = 2147483647; // Infinity is not valid.
  }

  overlay.style.left       = (rect.left + window.scrollX) + 'px';
  overlay.style.top        = (rect.top  + window.scrollY) + 'px';
  overlay.style.height     = rect.height + 'px';
  overlay.style.width      = rect.width  + 'px';
  overlay.style.visibility = 'visible';
}

/**
 * Hides overlays at minIndex and above.
 * @param {Number} minIndex minimum index to hide at.
 */
function hideOverlays(minIndex) {
  var overlays = window[NAMESPACE].overlays;
  for (var i = overlays.length - 1; i >= minIndex; i--) {
    overlays[i].style.visibility = 'hidden';
  }
}

/**
 * Highlights an element in the page.
 * @param  {Number} key Key of the element to highlight
 */
function highlight(key) {
  var element = window[NAMESPACE].DOMCache[key];
  if (window[NAMESPACE].highlightedElement == element) return;
  window[NAMESPACE].highlightedElement = element;

  var rects = element.getClientRects();
  for (var i = 0, rect; rect = rects[i]; i++) {
    window[NAMESPACE].renderOverlay(rect, i);
  }
  // And mop up any extras.
  window[NAMESPACE].hideOverlays(rects.length);
}

/**
 * Unhighlights an element in the page.
 * @param  {Number} key Key of the element in the page
 */
function unhighlight(key) {
  var element = window[NAMESPACE].DOMCache[key];
  if (window[NAMESPACE].highlightedElement == element) {
    window[NAMESPACE].highlightedElement = null;
    window[NAMESPACE].hideOverlays(0);
  }
}

/**
 * Scrolls an element into view.
 * @param  {Number} key key of the element in the page
 */
function scrollIntoView(key) {
  if (key in window[NAMESPACE].DOMCache) {
    window[NAMESPACE].DOMCache[key].scrollIntoView();
  }
}

/**
 * Sets a breakpoint on a method of an element.
 * @param {Number} key  Key of the element
 * @param {Array}  path path to find the method in the element
 */
function setBreakpoint(key, path) {
  var method = window[NAMESPACE].resolveObject(key, path);
  var methodName = window[NAMESPACE].getPropPath(key, path).pop();
  if (typeof method !== 'function') {
    return;
  }
  if (!(key in window[NAMESPACE].breakPointIndices)) {
    window[NAMESPACE].breakPointIndices[key] = {};
  }
  window[NAMESPACE].breakPointIndices[key][methodName] = true;
  debug(method);
}

/**
 * Clears a breakpoint on a method of an element.
 * @param  {Number} key  Key of the element
 * @param  {Array}  path path to find the method in the element
 */
function clearBreakpoint(key, path) {
  var method = window[NAMESPACE].resolveObject(key, path);
  var methodName = window[NAMESPACE].getPropPath(key, path).pop();
  if (typeof method !== 'function') {
    return;
  }
  if ((key in window[NAMESPACE].breakPointIndices) &&
    (methodName in window[NAMESPACE].breakPointIndices[key])) {
    delete window[NAMESPACE].breakPointIndices[key][methodName];
  }
  undebug(method);
}

/**
 * Returns a string property path from an index property path (which is used by the UI).
 * @param  {Number}  key     Key of the element
 * @param  {Array}   path    index property path
 * @param  {Boolean} isModel if the object is from the model-tree
 * @return {Array}           The string property path (array of property names)
 */
function getPropPath(key, path, isModel) {
  var propPath = [];
  var indexMap = isModel ? window[NAMESPACE].modelIndexToPropMap[key] :
    window[NAMESPACE].indexToPropMap[key];
  path.forEach(function(el) {
    indexMap = indexMap[el];
    propPath.push(indexMap.__name__);
  });
  return propPath;
}

/**
 * Finds an object given an element's key and a path to reach the object.
 * @param  {Number}  key     Key of the element.
 * @param  {Array}   path    The index path to find the object.
 * @param  {Boolean} isModel If the object is to be looked under the model of the element.
 * @return {<T>}             The object that was found.
 * @template T
 */
function resolveObject(key, path, isModel) {
  var obj = isModel ? window[NAMESPACE].DOMModelCache[key] :
    window[NAMESPACE].DOMCache[key];
  var propPath = window[NAMESPACE].getPropPath(key, path, isModel);
  propPath.forEach(function(el) {
    obj = obj[el];
  });
  return obj;
}

/**
 * Changes a property of an element in the page.
 * @param  {Number}  key      Key of the element
 * @param  {Array}   path     index path to find the element
 * @param  {<T>}     newValue the new value to put
 * @param  {Boolean} isModel  if it is a model object
 * @template T
 */
function changeProperty(key, path, newValue, isModel) {
  var prop = window[NAMESPACE].getPropPath(key, path, isModel).pop();
  path.pop();
  var obj = window[NAMESPACE].resolveObject(key, path, isModel);
  if (obj) {
    obj[prop] = newValue;
  }
}

/**
 * Gets a property of an element.
 * @param  {Number}  key     Key of the element
 * @param  {Array}   path    Index path to find the property
 * @param  {Boolean} isModel if it is a model object
 * @return {Object}          A wrapped JSON object containing the latest value
 */
function getProperty(key, path, isModel) {
  var prop = window[NAMESPACE].getPropPath(key, path, isModel).pop();
  path.pop();
  var obj = window[NAMESPACE].resolveObject(key, path, isModel);
  return window[NAMESPACE].JSONizer.JSONizeProperty(prop, obj);
}

/**
 * Adds an element to DOMCache and DOMModelCache.
 * @param {HTMLElement} obj the element to cache
 * @param {Number}      key The key to identify it with
 */
function addToCache(obj, key) {
  if (obj.tagName === 'TEMPLATE' && obj.model) {
    window[NAMESPACE].DOMModelCache[key] = obj.model;
  } else if (obj.templateInstance) {
    window[NAMESPACE].DOMModelCache[key] = obj.templateInstance.model;
  }
  window[NAMESPACE].DOMCache[key] = obj;
}

/**
 * Used as a listener to inspector selection changes.
 */
function inspectorSelectionChangeListener() {
  if ($0.__keyPolymer__) {
    window.dispatchEvent(new CustomEvent(window[NAMESPACE].getNamespacedEventName('inspected-element-changed'), {
      detail: {
        key: $0.__keyPolymer__
      }
    }));
  }
}

/**
 * Goes deep into indexMap to find the subIndexMap that stores information about
 * the object found by traversing through `path`.
 * @param  {Number}  key     Key of the element
 * @param  {Array}   path    The index path to traverse with
 * @param  {Boolean} isModel if it is a model object
 * @return {Object}          Sub index-map
 */
function getIndexMapObject(key, path, isModel) {
  var start = isModel ? window[NAMESPACE].modelIndexToPropMap[key] :
    window[NAMESPACE].indexToPropMap[key];
  for (var i = 0; i < path.length; i++) {
    start = start[path[i]];
  }
  return start;
}

/**
 * Adds a new property to a sub-index map. It creates a mapping between a property
 * name and its associated index (as managed by the extension UI) and also a reverse
 * mapping. Note: 'name-' is prepended to the property name key.
 * @param {Object} indexMap sub-Index map
 * @param {String} propName Property name
 */
function addToSubIndexMap(indexMap, propName) {
  indexMap.__lastIndex__ = '__lastIndex__' in indexMap ? (indexMap.__lastIndex__ + 1) : 0;
  indexMap[indexMap.__lastIndex__] = {
    __name__: propName
  };
  indexMap['name-' + propName] = indexMap.__lastIndex__;
}

/**
 * Removes a property from a sub index map.
 * @param  {Object} indexMap The sub-index map
 * @param  {Number} index    The index to remove the property of
 */
function removeFromSubIndexMap(indexMap, index) {
  var propName = indexMap[index].__name__;
  for (var i = index + 1; i <= indexMap.__lastIndex__; i++) {
    indexMap[i - 1] = indexMap[i];
  }
  delete indexMap['name-' + propName];
  delete indexMap[indexMap.__lastIndex__--];
}

/**
 * Empties a sub-index map.
 * @param  {Number}  key     Key of the element
 * @param  {Array}   path    index array to find the sub-index map
 * @param  {Boolean} isModel if we have to look in the model index map
 */
function emptySubIndexMap(key, path, isModel) {
  // Find the sub-index map
  var indexMap = isModel ? window[NAMESPACE].modelIndexToPropMap :
    window[NAMESPACE].indexToPropMap;
  var start = indexMap[key];
  var lastIndex = path.pop();
  if (!lastIndex) {
    indexMap[key] = {};
    indexMap[key].__lastIndex__ = -1;
    return;
  }
  for (var i = 0; i < path.length; i++) {
    start = start[path[i]];
  }
  var name = start[lastIndex].__name__;
  start[lastIndex] = {
    __name__: name
  };
  start[lastIndex].__lastIndex__ = -1;
}

/**
 * Tells if an element is a Polymer element
 * @param  {HTMLElement}     element the element we want to check
 * @return {Boolean}                  whether it is a Polymer element
 */
function isPolymerElement(element) {
  return element && ('element' in element) && (element.element.localName === 'polymer-element');
}

/**
 * A property filter
 * @param  {String} prop A property name
 * @return {Boolean}     Whether it is to be kept or not.
 */
function filterProperty(prop) {
  return prop[0] !== '_' && prop.slice(-1) !== '_' && !filterProperty.blacklist[prop];
}

// IMPORTANT: First set filterProperty and then call setBlacklist.
// See :
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement
// and
// https://developer.mozilla.org/en-US/docs/Web/API/Element
// TODO: Improve blacklist
/**
 * Sets the static blacklist property on `filterProperty`
 */
function setBlacklist() {
  window[NAMESPACE].filterProperty.blacklist = {
    accessKey: true,
    align: true,
    attributes: true,
    baseURI: true,
    childElementCount: true,
    childNodes: true,
    children: true,
    classList: true,
    className: true,
    clientHeight: true,
    clientLeft: true,
    clientTop: true,
    clientWidth: true,
    contentEditable: true,
    dataset: true,
    dir: true,
    draggable: true,
    firstChild: true,
    firstElementChild: true,
    hidden: true,
    id: true,
    innerHTML: true,
    innerText: true,
    inputMethodContext: true,
    isContentEditable: true,
    lang: true,
    lastChild: true,
    lastElementChild: true,
    localName: true,
    namespaceURI: true,
    nextElementSibling: true,
    nextSibling: true,
    nodeName: true,
    nodeType: true,
    nodeValue: true,
    offsetHeight: true,
    offsetLeft: true,
    offsetParent: true,
    offsetTop: true,
    offsetWidth: true,
    onabort: true,
    onbeforecopy: true,
    onbeforecut: true,
    onbeforepaste: true,
    onblur: true,
    oncancel: true,
    oncanplay: true,
    oncanplaythrough: true,
    onchange: true,
    onclick: true,
    onclose: true,
    oncontextmenu: true,
    oncopy: true,
    oncuechange: true,
    oncut: true,
    ondblclick: true,
    ondrag: true,
    ondragend: true,
    ondragenter: true,
    ondragleave: true,
    ondragover: true,
    ondragstart: true,
    ondrop: true,
    ondurationchange: true,
    onemptied: true,
    onended: true,
    onerror: true,
    onfocus: true,
    oninput: true,
    oninvalid: true,
    onkeydown: true,
    onkeypress: true,
    onkeyup: true,
    onload: true,
    onloadeddata: true,
    onloadedmetadata: true,
    onloadstart: true,
    onmousedown: true,
    onmouseenter: true,
    onmouseleave: true,
    onmousemove: true,
    onmouseout: true,
    onmouseover: true,
    onmouseup: true,
    onmousewheel: true,
    onpaste: true,
    onpause: true,
    onplay: true,
    onplaying: true,
    onprogress: true,
    onratechange: true,
    onreset: true,
    onresize: true,
    onscroll: true,
    onsearch: true,
    onseeked: true,
    onseeking: true,
    onselect: true,
    onselectstart: true,
    onshow: true,
    onstalled: true,
    onsubmit: true,
    onsuspend: true,
    ontimeupdate: true,
    onvolumechange: true,
    onwaiting: true,
    onwebkitfullscreenchange: true,
    onwebkitfullscreenerror: true,
    onwheel: true,
    outerHTML: true,
    outerText: true,
    ownerDocument: true,
    parentElement: true,
    parentNode: true,
    prefix: true,
    previousElementSibling: true,
    previousSibling: true,
    scrollHeight: true,
    scrollLeft: true,
    scrollTop: true,
    scrollWidth: true,
    shadowRoot: true,
    spellcheck: true,
    style: true,
    tabIndex: true,
    tagName: true,
    textContent: true,
    title: true,
    translate: true,
    webkitShadowRoot: true,
    webkitdropzone: true,
    resolvePath: true,

    shadowRoots: true,
    $: true,
    controller: true,
    eventDelegates: true,
    reflect: true,

    onautocomplete: true,
    onautocompleteerror: true,
    ontoggle: true,
    hasBeenAttached: true,
    element: true
  };
}

/**
 * Processes a list of DOM mutations given by mutation observers and for each
 * mutation, creates a JSONized object for the element that got affected.
 * @param  {Array} mutations Array of mutations
 * @return {Array}           List of JSON objects each representing a changed element.
 */
function processMutations(mutations) {
  var changedElementKeys = {};
  var changedElements = [];
  for (var i = 0; i < mutations.length; i++) {
    var mutation = mutations[i];
    if (mutation.type !== 'childList') {
      // We are interested only in childList mutations
      continue;
    }
    var changedElement = mutation.target;
    if (changedElement.host) {
      changedElement = changedElement.host;
    }
    if (changedElement.__keyPolymer__ in changedElementKeys) {
      continue;
    }
    // We should ideally remove all the removed nodes from `DOMCache` but it
    // would involve finding all children of a removed node (recursively through the
    // composed DOM). So we let them be.
    changedElements.push(window[NAMESPACE].getDOMJSON(changedElement));
    changedElementKeys[changedElement.__keyPolymer__] = true;
  }
  return changedElements;
}

/**
 * Returns JSON representation for a DOM element
 * @param  {Object} el An element
 * @return {Object}    A JSON representation of the element
 */
function getDOMJSON(el) {
  return {
    'data': window[NAMESPACE].JSONizer.JSONizeDOMObject(el || document.body,
      function(domNode, converted, isLightDOM) {
        if (!domNode.__keyPolymer__) {
          if (isLightDOM) {
            // Something that wasn't found in the composed tree but found in the light DOM
            // was probably not rendered.
            converted.unRendered = true;
          } else if ((window[NAMESPACE].isPolymerElement(domNode) && !domNode.shadowRoot)) {
            // Polymer elements may not have shadow roots. So, the composed DOM tree is the light DOM tree
            // and has nothing do with the shadow DOM.
            converted.noShadowRoot = true;
          }
          // For every element found during traversal, we store it in a hash-table with a unique key.
          window[NAMESPACE].lastDOMKey++;
          var key = window[NAMESPACE].lastDOMKey;
          window[NAMESPACE].addToCache(domNode, key);
          // Also make a map to store the actual property names to the indices corresponding to the names
          // before passing it to the caller.
          window[NAMESPACE].indexToPropMap[key] = {};
          window[NAMESPACE].modelIndexToPropMap[key] = {};
          domNode.__keyPolymer__ = key;

          // DOM mutation listeners are added to the very first element (the parent) of all elements
          // so that it will report all light DOM changes and to *all* shadow roots so they will
          // report all shadow DOM changes.
          if (key === window[NAMESPACE].firstDOMKey || domNode.shadowRoot) {
            var observer = new MutationObserver(function(mutations) {
              window.dispatchEvent(new CustomEvent(window[NAMESPACE].getNamespacedEventName('dom-mutation'), {
                detail: window[NAMESPACE].processMutations(mutations)
              }));
            });
            window[NAMESPACE].mutationObserverCache[key] = observer;
            var config = {
              childList: true,
              subtree: true
            };
            if (key === window[NAMESPACE].firstDOMKey) {
              observer.observe(domNode, config);
            }
            if (domNode.shadowRoot) {
              observer.observe(domNode.shadowRoot, config);
            }
          }
        }
        converted.key = domNode.__keyPolymer__;
        var isPolymer = window[NAMESPACE].isPolymerElement(domNode);
        if (domNode.parentNode) {
          // Set the parent node key.
          // The || is because <a> elements have a 'host' property which is a string.
          if (domNode.parentNode.host && typeof domNode.parentNode.host === 'object') {
            converted.parentKey = domNode.parentNode.host.__keyPolymer__;
          } else {
            converted.parentKey = domNode.parentNode.__keyPolymer__;
          }
        }
        // conditionally set the properties
        if (isPolymer) {
          converted.isPolymer = true;
          converted.sourceURL = domNode.element.ownerDocument.URL;
        }
      }
    )
  };
}

/**
 * Returns a JSON representation for an object
 * @param  {Number}  key     The key of the element to which the object belongs
 * @param  {Array}   path    Path to reach the object from the element's top level
 * @param  {Boolean} isModel If the object is a model object
 * @return {Object}          A JSON object representation
 */
function getObjectJSON(key, path, isModel) {
  var obj = window[NAMESPACE].resolveObject(key, path, isModel);
  if (!obj) {
    return {
      'data': JSON.stringify({
        value: []
      })
    };
  }
  var indexMap = window[NAMESPACE].getIndexMapObject(key, path, isModel);
  var filter = null;
  if (path.length === 0) {
    filter = function(prop) {
      return prop !== '__keyPolymer__';
    };
  }
  if (window[NAMESPACE].isPolymerElement(obj)) {
    filter = function(prop) {
      return window[NAMESPACE].filterProperty(prop) && prop !== '__keyPolymer__';
    };
  }
  return {
    'data': window[NAMESPACE].JSONizer.
    JSONizeObject(obj, function(converted) {
        var propList = converted.value;
        for (var i = 0; i < propList.length; i++) {
          if (!isModel) {
            if (path.length === 0 && (key in window[NAMESPACE].breakPointIndices) &&
              (propList[i].name in window[NAMESPACE].breakPointIndices[key])) {
              converted.value[i].setBreakpoint = true;
            }
          }
          var propName = propList[i].name;
          // Must associate each index to the corresponding property name.
          window[NAMESPACE].addToSubIndexMap(indexMap, propName, isModel);
        }
      },
      filter)
  };
}

/**
 * Adds an object observer to an object
 * @param {Number}  key     Key of the element to which the object belongs
 * @param {Array}   path    Path to reach the object from the element's top level
 * @param {Boolean} isModel If the object is a model object
 */
function addObjectObserver(key, path, isModel) {
  /**
   * Checks if a property is a present in the higher proto levels of the object
   * @param  {String} prop The property we are looking at
   * @param  {Object} obj  The object that owns the property
   * @return {Boolean}     If it is present somewhere above.
   */
  function checkChainUpForProp(prop, obj) {
    var proto = obj.__proto__;
    while (proto) {
      if (proto.hasOwnProperty(prop)) {
        return true;
      }
      proto = proto.__proto__;
    }
    return false;
  }
  /**
   * Checks if a property is present in lower proto levels of an object
   * @param  {String} prop     The property
   * @param  {Object} protoObj The level below which we are looking
   * @param  {Object} obj      The starting level to look from
   * @return {Boolean}         If it was found.
   */
  function checkChainDownForProp(prop, protoObj, obj) {
    var proto = obj;
    while (proto !== protoObj && proto) {
      if (proto.hasOwnProperty(prop)) {
        return true;
      }
      proto = proto.__proto__;
    }
    return false;
  }
  var obj = window[NAMESPACE].resolveObject(key, path, isModel);
  if (!obj) {
    // This is because an element may not have a `model` and we just ignore it.
    // No observer can be added
    return;
  }
  var indexMap = window[NAMESPACE].getIndexMapObject(key, path, isModel);

  /**
   * Processes O.o() changes
   * @param  {Array} changes Array of changes given by O.o()
   * @return {Object}         Looks like:
   * {
   *   path: <path of the object>,
   *   key: <DOM element's key>,
   *   changes: [
   *     {
   *       index: <the index by which the UI knows about the property>,
   *       name: <the property's name>,
   *       type: <the type of change (see O.o() docs),
   *       object: <the changed object at the property, wrapped in another object>
   *     },
   *     // one of every change
   *   ]
   * }
   */
  function processChanges(changes) {
    var processedChangeObject = {
      isModel: isModel,
      path: path,
      key: key,
      changes: []
    };
    for (var i = 0; i < changes.length; i++) {
      var change = changes[i];
      var summary = {
        index: indexMap['name-' + change.name],
        type: change.type,
        name: change.name
      };
      if (change.object !== obj) {
        if (checkChainDownForProp(change.name, change.obj, obj)) {
          continue;
        }
      }
      switch (change.type) {
        case 'update':
          // We've chosen to ignore certain Polymer properties which may have gotten updated
          if (window[NAMESPACE].isPolymerElement(obj) &&
            !window[NAMESPACE].filterProperty(change.name)) {
            continue;
          }
          // We might be dealing with non-Objects which DOMJSONizer can't JSONize.
          // So we wrap it and then let the caller unwrap later.
          var wrappedObject = {
            value: change.object[change.name]
          };
          summary.object = window[NAMESPACE].JSONizer.
          JSONizeObject(wrappedObject);
          break;
        case 'delete':
          if (checkChainUpForProp(change.name, obj)) {
            // Though it is a deletion at one level, the same property also exists
            // in a higher prototype object, so this is an update in the view of the UI
            // This applies only to Polymer elements because of how multiple prototype levels are traversed
            // only for Polymer elements.
            summary.type = 'update';
            var wrappedObject = {
              value: change.object[change.name]
            };
            summary.object = window[NAMESPACE].JSONizer.
            JSONizeObject(wrappedObject);
          } else {
            // Update the index-to-propName map to reflect the deletion
            window[NAMESPACE].removeFromSubIndexMap(indexMap, indexMap['name-' + change.name], isModel);
          }
          break;
        case 'add':
          if (window[NAMESPACE].isPolymerElement(obj) &&
            !window[NAMESPACE].filterProperty(change.name)) {
            continue;
          }
          var wrappedObject = {
            value: change.object[change.name]
          };
          summary.object = window[NAMESPACE].JSONizer.
          JSONizeObject(wrappedObject);
          if (window[NAMESPACE].isPolymerElement(obj) &&
            checkChainUpForProp(change.name, obj)) {
            // Even though this is an addition at one level, this is an update in the view of the UI
            // because another property of the same name is already shown.
            // This applies only to Polymer elements because of how multiple prototype levels are traversed
            // only for Polymer elements.
            summary.type = 'update';
          } else {
            window[NAMESPACE].addToSubIndexMap(indexMap, change.name, isModel);
          }
          break;
      }
      processedChangeObject.changes.push(summary);
    }
    return processedChangeObject;
  }

  function observer(changes) {
    window.dispatchEvent(new CustomEvent(window[NAMESPACE].getNamespacedEventName('object-changed'), {
      detail: processChanges(changes)
    }));
  }
  Object.observe(obj, observer);

  var proto = obj.__proto__;
  while (proto && !Polymer.isBase(proto)) {
    Object.observe(proto, observer);
    proto = proto.__proto__;
  }
  var observerCache = isModel ? window[NAMESPACE].modelObserverCache :
    window[NAMESPACE].observerCache;
  // Store the observer function so that we can unobserve when we need to.
  if (!observerCache[key]) {
    observerCache[key] = {};
  }
  var hashLocation = observerCache[key];
  for (var i = 0; i < path.length; i++) {
    if (!hashLocation[path[i]]) {
      hashLocation[path[i]] = {};
    }
    hashLocation = hashLocation[path[i]];
  }
  hashLocation['__objectObserver__'] = observer;
}

/**
 * removes an object observer
 * @param  {Number}  key     Key of the element that owns the object
 * @param  {Array}   path    Path to reach the object
 * @param  {Boolean} isModel If the object is a model object
 */
function removeObjectObserver(key, path, isModel) {
  function recursiveUnobserve(obj, hashLocation, indexMap) {
    if (hashLocation['__objectObserver__']) {
      Object.unobserve(obj, hashLocation['__objectObserver__']);
      if (window[NAMESPACE].isPolymerElement(obj)) {
        // Polymer objects have listeners on multiple proto levels
        var proto = obj.__proto__;
        while (proto && !Polymer.isBase(proto)) {
          Object.unobserve(proto, hashLocation['__objectObserver__']);
          proto = proto.__proto__;
        }
      }
      var props = Object.keys(hashLocation);
      for (var i = 0; i < props.length; i++) {
        if (props[i] === '__objectObserver__') {
          continue;
        }
        recursiveUnobserve(obj[indexMap[props[i]].__name__], hashLocation[props[i]], indexMap[props[i]]);
      }
    }
  }
  var obj = window[NAMESPACE].resolveObject(key, path, isModel);
  if (!obj) {
    // This is because an element may not have a `model` and we just ignore it.
    // No observer can be added
    return;
  }
  var parent = isModel ? window[NAMESPACE].modelObserverCache :
    window[NAMESPACE].observerCache;
  var hashLocation = parent[key];
  var indexMap = isModel ? window[NAMESPACE].modelIndexToPropMap[key] :
    window[NAMESPACE].indexToPropMap[key];
  for (var i = 0; i < path.length; i++) {
    parent = hashLocation;
    hashLocation = hashLocation[path[i]];
    indexMap = indexMap[path[i]];
  }
  // All objects under this have to be unobserved
  recursiveUnobserve(obj, hashLocation, indexMap);
  delete parent[path.length === 0 ? key : path[path.length - 1]];
}

/**
 * Creates all the data-structures needed by the extension to maintain a consitent image
 * of the page.
 */
function createCache() {
  // All DOM elements discovered are hashed by a unique key
  window[NAMESPACE].DOMCache = {};
  // A similar map is maintained for the models associated with the DOM objects
  window[NAMESPACE].DOMModelCache = {};
  // O.o() observers are hashed so they can be removed when needed
  window[NAMESPACE].observerCache = {};
  window[NAMESPACE].modelObserverCache = {};
  window[NAMESPACE].breakPointIndices = {};
  // indexToPropMap maps indices to property names
  // The UI maintains properties as an array (to keep them ordered). To keep an
  // association with real object properties and those, we need a map.
  window[NAMESPACE].indexToPropMap = {};
  window[NAMESPACE].modelIndexToPropMap = {};
  window[NAMESPACE].firstDOMKey = 1;
  // The key of the last DOM element added
  window[NAMESPACE].lastDOMKey = window[NAMESPACE].firstDOMKey - 1;
  // Mutation observers are stored so they can be removed later
  window[NAMESPACE].mutationObserverCache = {};
  window[NAMESPACE].JSONizer = new window[NAMESPACE].DOMJSONizer();
  // All active overlays
  window[NAMESPACE].overlays = [];
}
