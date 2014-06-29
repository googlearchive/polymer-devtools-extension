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
  element.style.backgroundColor = 'rgba(255,0,0,0.1)';
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
  debug(method);
}

/**
* Clear the breakpoint at the beginning of a function
*/
function clearBreakpoint (key, path) {
  var method = window._polymerNamespace_.resolveObject(key, path);
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
  window._polymerNamespace_.DOMCache[key] = obj;
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
    start = {};
    start.__lastIndex__ = -1;
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
  return {
    'data': window._polymerNamespace_.serializer.
      serializeObject(obj, function (converted) {
        var propList = converted.value;
        for (var i = 0; i < propList.length; i++) {
          var propName = propList[i].name;
          // Must associate each index to the corresponding property name.
          window._polymerNamespace_.addToSubIndexMap(indexMap, propName);
        }
      })
  };
}

/**
* Add an object observer that reports changes to it using O.o()
*/
function addObjectObserver (key, path) {
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
          // Update the index-to-propName map to reflect the deletion
          window._polymerNamespace_.removeFromSubIndexMap(indexMap, indexMap['name-' + change.name]);
          break;
        case 'add':
          var wrappedObject = {
            value: change.object[change.name]
          };
          summary.object = window._polymerNamespace_.serializer.
            serializeObject(wrappedObject);
          window._polymerNamespace_.addToSubIndexMap(indexMap, change.name);
          break;
      }
      processedChangeObject.changes.push(summary);
    }
    return JSON.stringify(processedChangeObject);
  }
  function observer (changes) {
    // TODO: deal with unwanted new properties
    console.log('observing');
    window.dispatchEvent(new CustomEvent('object-changed', {
      detail: processChanges(changes)
    }));
  }
  Object.observe(obj, observer);

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
  var obj = window._polymerNamespace_.resolveObject(key, path);
  var parent = window._polymerNamespace_.observerCache;
  var hashLocation = parent[key];
  for (var i = 0; i < path.length; i++) {
    parent = hashLocation;
    hashLocation = hashLocation[path[i]];
  }
  console.log('removing');
  console.log(path);
  console.log(hashLocation['__objectObserver__']);
  Object.unobserve(obj, hashLocation['__objectObserver__']);
  delete parent[path.length === 0 ? key : path[path.length - 1]];
}

function createCache() {
  // TODO: Must create cache at different levels (for DOM mutations)
  window._polymerNamespace_.DOMCache = {};
  window._polymerNamespace_.indexToPropMap = {};
  // The key of the last DOM element added
  window._polymerNamespace_.lastDOMKey = 0;
}
