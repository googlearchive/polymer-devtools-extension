// All these helpers are meant to be injected into the host page as strings
// after .toString()

/**
* Highlight an element in the page
* isHover: true if element is to be highlighted because it was hovered
* over in the element-tree.
*/
function highlight (key, isHover) {
  var element = window._polymerNamespace_.DOMCache[key];
  if (isHover) {
    window._polymerNamespace_.prevHoveredOutline = element.style.outline;
    window._polymerNamespace_.prevHoveredBackgroundColor = element.style.backgroundColor;
  } else {
    window._polymerNamespace_.unhighlight(key, true);
    if (window._polymerNamespace_.lastSelectedKey) {
      window._polymerNamespace_.unhighlight(window._polymerNamespace_.lastSelectedKey, false);
    }
    window._polymerNamespace_.lastSelectedKey = key;
    window._polymerNamespace_.prevSelectedOutline = element.style.outline;
    window._polymerNamespace_.prevSelectedBackgroundColor = element.style.backgroundColor;
  }
  element.style.outline = '1px dashed red';
  element.style.backgroundColor = 'rgba(255,0,0,0.1)';
}

/**
* Unhighlight the highlighted element in the page
* isHover: true if element is to be unhighlighted because it was hovered
* out in the element-tree.
*/
function unhighlight (key, isHover) {
  var element = window._polymerNamespace_.DOMCache[key];
  element.style.outline = isHover ? window._polymerNamespace_.prevHoveredOutline :
    window._polymerNamespace_.prevSelectedOutline;
  element.style.backgroundColor = isHover ? window._polymerNamespace_.prevHoveredBackgroundColor :
    window._polymerNamespace_.prevSelectedBackgroundColor;
}

/**
* Scroll an element into view
*/
function scrollIntoView (key) {
  if (key in window._polymerNamespace_.DOMCache) {
    window._polymerNamespace_.DOMCache[key].scrollIntoView();
  }
}

/*function addElementSelectionCSS (key) {
  function mouseEnter (event) {
    event.stopPropagation();
  }
  function mouseLeave (event) {
    event.stopPropagation();
  }
  var element = window._polymerNamespace_.DOMCache[key];
    element.
}
*/

/**
* Set a breakpoint at the beginning of a function
*/
function setBreakpoint (key, path) {
  var method = window._polymerNamespace_.resolveObject(key, path);
  var methodName = window._polymerNamespace_.getPropPath(key, path).pop();
  if (typeof method !== 'function') {
    return;
  }
  if (!(key in window._polymerNamespace_.breakPointIndices)) {
    window._polymerNamespace_.breakPointIndices[key] = {};
  }
  window._polymerNamespace_.breakPointIndices[key][methodName] = true;
  debug(method);
}

/**
* Clear the breakpoint at the beginning of a function
*/
function clearBreakpoint (key, path) {
  var method = window._polymerNamespace_.resolveObject(key, path);
  var methodName = window._polymerNamespace_.getPropPath(key, path).pop();
  if (typeof method !== 'function') {
    return;
  }
  if ((key in window._polymerNamespace_.breakPointIndices) &&
    (methodName in window._polymerNamespace_.breakPointIndices[key])) {
    delete window._polymerNamespace_.breakPointIndices[key][methodName];
  }
  undebug(method);
}

/**
* Get the property (property names) path from the index path (as it is stored in the UI)
* isModel tells if we should into the model data structures
*/
function getPropPath (key, path, isModel) {
  var propPath = [];
  var indexMap = isModel ? window._polymerNamespace_.modelIndexToPropMap[key] :
    window._polymerNamespace_.indexToPropMap[key];
  path.forEach(function (el) {
    indexMap = indexMap[el];
    propPath.push(indexMap.__name__);
  });
  return propPath;
}

/**
* Find the object given a DOM element key and the index path
* isModel tells if we should into the model data structures
*/
function resolveObject (key, path, isModel) {
  var obj = isModel ? window._polymerNamespace_.DOMModelCache[key] :
    window._polymerNamespace_.DOMCache[key];
  var propPath = window._polymerNamespace_.getPropPath(key, path, isModel);
  propPath.forEach(function (el) {
    obj = obj[el];
  });
  return obj;
}

/**
* Reflect a change in the host page
* isModel tells if we should into the model data structures
*/
function changeProperty (key, path, newValue, isModel) {
  var prop = window._polymerNamespace_.getPropPath(key, path, isModel).pop();
  path.pop();
  var obj = window._polymerNamespace_.resolveObject(key, path, isModel);
  if (obj) {
    obj[prop] = newValue;
  }
}

/**
* Get a property somewhere inside an element (repesented by path)
* isModel tells if we should into the model data structures
*/
function getProperty (key, path, isModel) {
  var prop = window._polymerNamespace_.getPropPath(key, path, isModel).pop();
  path.pop();
  var obj = window._polymerNamespace_.resolveObject(key, path, isModel);
  return window._polymerNamespace_.serializer.serializeProperty(prop, obj);
}

function addToCache (obj, key) {
  if (obj.tagName === 'TEMPLATE' && obj.model) {
    window._polymerNamespace_.DOMModelCache[key] = obj.model;
  } else if (obj.templateInstance) {
    window._polymerNamespace_.DOMModelCache[key] = obj.templateInstance.model;
  }
  window._polymerNamespace_.DOMCache[key] = obj;
}

/**
* Called when the selection in the inspector changes
*/
function inspectorSelectionChangeListener () {
  if ($0.__keyPolymer__) {
    window.dispatchEvent(new CustomEvent('inspected-element-changed', {
      detail : {
        key: $0.__keyPolymer__
      }
    }));
  }
}

/**
* Go as deep as required by `path` into `indexToPropMap`
* isModel tells if we should into the model data structures
*/
function getIndexMapObject (key, path, isModel) {
  var start = isModel ? window._polymerNamespace_.modelIndexToPropMap[key] :
    window._polymerNamespace_.indexToPropMap[key];
  for (var i = 0; i < path.length; i++) {
    start = start[path[i]];
  }
  return start;
}

/**
* Given the index map (at any depth), add a property name
*/
function addToSubIndexMap (indexMap, propName) {
  indexMap.__lastIndex__ = '__lastIndex__' in indexMap ? (indexMap.__lastIndex__ + 1) : 0;
  indexMap[indexMap.__lastIndex__] = {
    __name__: propName
  };
  indexMap['name-' + propName] = indexMap.__lastIndex__;
}

/**
* Given the index map (at any depth), remove everything associated with an index
*/
function removeFromSubIndexMap (indexMap, index) {
  var propName = indexMap[index].__name__;
  for (var i = index + 1; i <= indexMap.__lastIndex__; i++) {
    indexMap[i - 1] = indexMap[i];
  }
  delete indexMap['name-' + propName];
  delete indexMap[indexMap.__lastIndex__--];
}

/**
* Add a property to `indexToPropMap`
* isModel tells if we should into the model data structures
*/
function addToIndexMap (propName, key, path, isModel) {
  var lastIndex = path.pop();
  var start = window._polymerNamespace_.getIndexMapObject(key, path, isModel);
  start[lastIndex] = {
    __name__: propName
  };
  start['name-' + propName] = propName;
  start.__lastIndex__ = start.__lastIndex__ ? (start.__lastIndex__ + 1) : 0;
}

/**
* Empty a part of `indexToPropMap`. (Used when the part of the object
* is no longer in view in the object tree.)
* isModel tells if we should into the model data structures
*/
function emptyIndexMap (key, path, isModel) {
  var indexMap = isModel ? window._polymerNamespace_.modelIndexToPropMap :
    window._polymerNamespace_.indexToPropMap;
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

function isPolymerElement (element) {
  return element && ('element' in element) && (element.element.localName === 'polymer-element');
}

function filterProperty (n) {
  return n[0] !== '_' && n.slice(-1) !== '_' && !filterProperty.blacklist[n];
}

// IMPORTANT: First set filterProperty and then call setBlacklist.
// TODO: Improve blacklist
function setBlacklist () {
  window._polymerNamespace_.filterProperty.blacklist = {
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

function processMutations (mutations) {
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
    changedElements.push(window._polymerNamespace_.getDOMString(changedElement));
    changedElementKeys[changedElements.__keyPolymer__] = true;
  }
  return JSON.stringify(changedElements);
}

/**
* Serialize el or document.body (if `el` isn't passed)
*/
function getDOMString (el) {
  return {
    'data': window._polymerNamespace_.serializer.serializeDOMObject(el || document.body,
      function (domNode, converted, lightDOM) {
        if (!domNode.__keyPolymer__) {
          if (lightDOM) {
            // Something that wasn't found in the composed tree but found in the light DOM
            // was probably not rendered.
            converted.unRendered = true;
          }
          // For every element found during traversal, we store it in a hash-table with a unique key.
          window._polymerNamespace_.lastDOMKey++;
          var key = window._polymerNamespace_.lastDOMKey;
          window._polymerNamespace_.addToCache(domNode, key);
          // Also make a map to store the actual property names to the indices corresponding to the names
          // before passing it to the caller.
          window._polymerNamespace_.indexToPropMap[key] = {};
          window._polymerNamespace_.modelIndexToPropMap[key] = {};
          domNode.__keyPolymer__ = key;
          converted.key = key;

          if (window._polymerNamespace_.isPolymerElement(domNode)) {
            converted.isPolymer = true;
          }
          if (key === 1 || domNode.shadowRoot) {
            var observer = new MutationObserver(function (mutations) {
              window.dispatchEvent(new CustomEvent('dom-mutation', {
                detail: window._polymerNamespace_.processMutations(mutations)
              }));
            });
            window._polymerNamespace_.mutationObserverCache[key] = observer;
            var config = {
              childList: true,
              subtree: true
            };
            if (key === 1) {
              observer.observe(domNode, config);
            }
            if (domNode.shadowRoot) {
              observer.observe(domNode.shadowRoot, config);
            }
          }
        } else {
          converted.key = domNode.__keyPolymer__;
        }
      }
    )
  };
}

/**
* Serialize an object one level deep
* isModel tells if we should into the model data structures
*/
function getObjectString (key, path, isModel) {
  var obj = window._polymerNamespace_.resolveObject(key, path, isModel);
  if (!obj) {
    return {
      'data': JSON.stringify({
        value: []
      })
    };
  }
  var indexMap = window._polymerNamespace_.getIndexMapObject(key, path, isModel);
  var filter = null;
  if (path.length === 0) {
    filter = function (prop) {
      return prop !== '__keyPolymer__';
    };
  }
  if (window._polymerNamespace_.isPolymerElement(obj)) {
    filter = function (prop) {
      return window._polymerNamespace_.filterProperty(prop) && prop !== '__keyPolymer__';
    };
  }
  return {
    'data': window._polymerNamespace_.serializer.
      serializeObject(obj, function (converted) {
        var propList = converted.value;
        for (var i = 0; i < propList.length; i++) {
          if (!isModel) {
            if (path.length === 0 && (key in window._polymerNamespace_.breakPointIndices) &&
              (propList[i].name in window._polymerNamespace_.breakPointIndices[key])) {
              converted.value[i].setBreakpoint = true;
            }
          }
          var propName = propList[i].name;
          // Must associate each index to the corresponding property name.
          window._polymerNamespace_.addToSubIndexMap(indexMap, propName, isModel);
        }
      },
      filter)
  };
}

/**
* Add an object observer that reports changes to it using O.o()
* isModel tells if we should into the model data structures
*/
function addObjectObserver (key, path, isModel) {
  /**
  * Checks if a property is present in the higher prototype objects
  * of an object.
  */
  function checkChainUpForProp (prop, obj) {
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
  * Checks if a property is present in the lower prototype objects
  * of an object.
  */
  function checkChainDownForProp (prop, protoObj, obj) {
    var proto = obj;
    while (proto !== protoObj && proto) {
      if (proto.hasOwnProperty(prop)) {
        return true;
      }
      proto = proto.__proto__;
    }
    return false;
  }
  console.log('adding observer');
  var obj = window._polymerNamespace_.resolveObject(key, path, isModel);
  if (!obj) {
    // This is because an element may not have a `model` and we just ignore it.
    // No observer can be added
    return;
  }
  var indexMap = window._polymerNamespace_.getIndexMapObject(key, path, isModel);

  /**
  * Returns a change object that looks like this:
  * {
  *   path: <path of the object>,
  *   key: <DOM element's key>,
  *   changes: [
  *     {
  *       index: <the index by which the UI knows about the property>,
  *       name: <the property's name>,
  *       type: <the type of change (see O.o() docs),
  *       object: <the changed object at the property wrapped in another object>
  *     },
  *     // one of every change
  *   ]
  * }
  */
  function processChanges (changes) {
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
          if (window._polymerNamespace_.isPolymerElement(obj) &&
              !window._polymerNamespace_.filterProperty(change.name)) {
            continue;
          }
          // We might be dealing with non-Objects which DOMSerializer can't serialize.
          // So we wrap it and then let the caller unwrap later.
          var wrappedObject = {
            value: change.object[change.name]
          };
          summary.object = window._polymerNamespace_.serializer.
            serializeObject(wrappedObject);
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
            summary.object = window._polymerNamespace_.serializer.
              serializeObject(wrappedObject);
          } else {
            // Update the index-to-propName map to reflect the deletion
            window._polymerNamespace_.removeFromSubIndexMap(indexMap, indexMap['name-' + change.name], isModel);
          }
          break;
        case 'add':
          if (window._polymerNamespace_.isPolymerElement(obj) &&
            !window._polymerNamespace_.filterProperty(change.name)) {
            continue;
          }
          var wrappedObject = {
            value: change.object[change.name]
          };
          summary.object = window._polymerNamespace_.serializer.
            serializeObject(wrappedObject);
          if (window._polymerNamespace_.isPolymerElement(obj) &&
            checkChainUpForProp(change.name, obj)) {
            // Even though this is an addition at one level, this is an update in the view of the UI
            // because another property of the same name is already shown.
            // This applies only to Polymer elements because of how multiple prototype levels are traversed
            // only for Polymer elements.
            summary.type = 'update';
          } else {
            window._polymerNamespace_.addToSubIndexMap(indexMap, change.name, isModel);
          }
          break;
      }
      processedChangeObject.changes.push(summary);
    }
    return JSON.stringify(processedChangeObject);
  }
  function observer (changes) {
    console.log('observing');
    window.dispatchEvent(new CustomEvent('object-changed', {
      detail: processChanges(changes)
    }));
  }
  Object.observe(obj, observer);

  var proto = obj.__proto__;
  while (proto && !Polymer.isBase(proto)) {
    Object.observe(proto, observer);
    proto = proto.__proto__;
  }
  var observerCache = isModel ? window._polymerNamespace_.modelObserverCache :
    window._polymerNamespace_.observerCache;
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
* Stop observing an object
* isModel tells if we should into the model data structures
*/
function removeObjectObserver (key, path, isModel) {
  function recursiveUnobserve (obj, hashLocation, indexMap) {
    if (hashLocation['__objectObserver__']) {
      Object.unobserve(obj, hashLocation['__objectObserver__']);
      if (window._polymerNamespace_.isPolymerElement(obj)) {
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
  var obj = window._polymerNamespace_.resolveObject(key, path, isModel);
  if (!obj) {
    // This is because an element may not have a `model` and we just ignore it.
    // No observer can be added
    return;
  }
  var parent = isModel ? window._polymerNamespace_.modelObserverCache :
    window._polymerNamespace_.observerCache;
  var hashLocation = parent[key];
  var indexMap = isModel ? window._polymerNamespace_.modelIndexToPropMap[key] :
    window._polymerNamespace_.indexToPropMap[key];
  for (var i = 0; i < path.length; i++) {
    parent = hashLocation;
    hashLocation = hashLocation[path[i]];
    indexMap = indexMap[path[i]];
  }
  // All objects under this have to be unobserved
  recursiveUnobserve(obj, hashLocation, indexMap);
  delete parent[path.length === 0 ? key : path[path.length - 1]];
}

function createCache() {
  // All DOM elements discovered are hashed by a unique key
  window._polymerNamespace_.DOMCache = {};
  // A similar map is maintained for the models associated with the DOM objects
  window._polymerNamespace_.DOMModelCache = {};
  // O.o() observers are hashed so they can be removed when needed
  window._polymerNamespace_.observerCache = {};
  window._polymerNamespace_.modelObserverCache = {};
  window._polymerNamespace_.breakPointIndices = {};
  // indexToPropMap maps indices to property names
  // The UI maintains properties as an array (to keep them ordered). To keep an
  // association with real object properties and those, we need a map.
  window._polymerNamespace_.indexToPropMap = {};
  window._polymerNamespace_.modelIndexToPropMap = {};
  // The key of the last DOM element added
  window._polymerNamespace_.lastDOMKey = 0;
  // Mutation observers are stored so they can be removed later
  window._polymerNamespace_.mutationObserverCache = {};
  window._polymerNamespace_.serializer = new window._polymerNamespace_.DOMSerializer();
}
