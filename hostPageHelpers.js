// All these helpers are meant to be injected into the host page as strings
// after .toString()

/**
* Highlight an element in the page
*/
function highlight (key) {
  window._polymerNamespace_.unhighlight();
  window._polymerNamespace_.lastHighlightedKey = key;
  var element = window._polymerNamespace_.DOMCache[key];
  window._polymerNamespace_.prevOutline = element.style.outline;
  window._polymerNamespace_.prevBackgroundColor = element.style.backgroundColor;
  element.style.outline = '1px dashed red';
  element.style.backgroundColor = 'rgba(255,0,0,0.1) !important';
}

/**
* Unhighlight the highlighted element in the page
*/
function unhighlight () {
  if (!window._polymerNamespace_.lastHighlightedKey) {
    return;
  }
  var element = window._polymerNamespace_.DOMCache[window._polymerNamespace_.lastHighlightedKey];
  element.style.outline = window._polymerNamespace_.prevOutline;
  element.style.backgroundColor = window._polymerNamespace_.prevBackgroundColor;
}

/**
* Scroll an element into view
*/
function scrollIntoView (key) {
  if (key in window._polymerNamespace_.DOMCache) {
    window._polymerNamespace_.DOMCache[key].scrollIntoView();
  }
}

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
*/
function getPropPath (key, path) {
  var propPath = [];
  var indexMap = window._polymerNamespace_.indexToPropMap[key];
  path.forEach(function (el) {
    indexMap = indexMap[el];
    propPath.push(indexMap.__name__);
  });
  return propPath;
}

/**
* Find the object given a DOM element key and the index path
*/
function resolveObject (key, path) {
  var obj = window._polymerNamespace_.DOMCache[key];
  var propPath = window._polymerNamespace_.getPropPath(key, path);
  propPath.forEach(function (el) {
    obj = obj[el];
  });
  return obj;
}

/**
* Reflect a change in the host page
*/
function changeProperty (key, path, newValue) {
  var prop = window._polymerNamespace_.getPropPath(key, path).pop();
  path.pop();
  var obj = window._polymerNamespace_.resolveObject(key, path);
  if (obj) {
    obj[prop] = newValue;
  }
}

/**
* Get a property somewhere inside an element (repesented by path)
*/
function getProperty (key, path) {
  var prop = window._polymerNamespace_.getPropPath(key, path).pop();
  path.pop();
  var obj = window._polymerNamespace_.resolveObject(key, path);
  var wrappedObject = {
    value: obj[prop]
  };
  return window._polymerNamespace_.serializer.serializeObject(wrappedObject);
}

function addToCache (obj, key) {
  if (obj.tagName === 'template' && obj.model) {
    window._polymerNamespace_.DOMCache[key] = obj;
  } else {
    window._polymerNamespace_.DOMCache[key] = obj;
  }
}

/**
* Go as deep as required by `path` into `indexToPropMap`
*/
function getIndexMapObject (key, path) {
  var start = window._polymerNamespace_.indexToPropMap[key];
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
*/
function addToIndexMap (propName, key, path) {
  var lastIndex = path.pop();
  var start = window._polymerNamespace_.getIndexMapObject(key, path);
  start[lastIndex] = {
    __name__: propName
  };
  start['name-' + propName] = propName;
  start.__lastIndex__ = start.__lastIndex__ ? (start.__lastIndex__ + 1) : 0;
}

/**
* Empty a part of `indexToPropMap`. (Used when the part of the object
* is no longer in view in the object tree.)
*/
function emptyIndexMap (key, path) {
  var start = window._polymerNamespace_.indexToPropMap[key];
  var lastIndex = path.pop();
  if (!lastIndex) {
    window._polymerNamespace_.indexToPropMap[key] = {};
    window._polymerNamespace_.indexToPropMap[key].__lastIndex__ = -1;
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

/**
* Serialize document.body
*/
function getDOMString () {
  window._polymerNamespace_.serializer = new window._polymerNamespace_.DOMSerializer();
  return {
    'data': window._polymerNamespace_.serializer.serializeDOMObject(document.body,
      function (domNode, converted) {
        // For every element found during traversal, we store it in a hash-table with a unique key.
        window._polymerNamespace_.lastDOMKey++;
        window._polymerNamespace_.addToCache(domNode, window._polymerNamespace_.lastDOMKey);
        // Also make a map to store the actual property names to the indices corresponding to the names
        // before passing it to the caller.
        window._polymerNamespace_.indexToPropMap[window._polymerNamespace_.lastDOMKey] = {};
        converted.key = window._polymerNamespace_.lastDOMKey;
      }
    )
  };
}

/**
* Serialize an object one level deep
*/
function getObjectString (key, path) {
  var obj = window._polymerNamespace_.resolveObject(key, path);
  var indexMap = window._polymerNamespace_.getIndexMapObject(key, path);
  var filter = null;
  if (window._polymerNamespace_.isPolymerElement(obj)) {
    filter = function (prop) {
      return window._polymerNamespace_.filterProperty(prop);
    };
  }
  return {
    'data': window._polymerNamespace_.serializer.
      serializeObject(obj, function (converted) {
        var propList = converted.value;
        for (var i = 0; i < propList.length; i++) {
          if (path.length === 0 && (key in window._polymerNamespace_.breakPointIndices) &&
            (propList[i].name in window._polymerNamespace_.breakPointIndices[key])) {
            converted.value[i].setBreakpoint = true;
          }
          var propName = propList[i].name;
          // Must associate each index to the corresponding property name.
          window._polymerNamespace_.addToSubIndexMap(indexMap, propName);
        }
      },
      filter)
  };
}

/**
* Add an object observer that reports changes to it using O.o()
*/
function addObjectObserver (key, path) {
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
  var obj = window._polymerNamespace_.resolveObject(key, path);
  var indexMap = window._polymerNamespace_.getIndexMapObject(key, path);

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
            window._polymerNamespace_.removeFromSubIndexMap(indexMap, indexMap['name-' + change.name]);
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
            window._polymerNamespace_.addToSubIndexMap(indexMap, change.name);
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
  // Store the observer function so that we can unobserve when we need to.
  if (!window._polymerNamespace_.observerCache[key]) {
    window._polymerNamespace_.observerCache[key] = {};
  }
  var hashLocation = window._polymerNamespace_.observerCache[key];
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
*/
function removeObjectObserver (key, path) {
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
  var obj = window._polymerNamespace_.resolveObject(key, path);
  var parent = window._polymerNamespace_.observerCache;
  var hashLocation = parent[key];
  var indexMap = window._polymerNamespace_.indexToPropMap[key];
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
  // TODO: Must create cache at different levels (for DOM mutations)
  window._polymerNamespace_.DOMCache = {};
  window._polymerNamespace_.breakPointIndices = {};
  window._polymerNamespace_.indexToPropMap = {};
  // The key of the last DOM element added
  window._polymerNamespace_.lastDOMKey = 0;
}
