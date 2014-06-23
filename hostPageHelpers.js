// All these helpers are meant to be injected into the host page as strings
// after .toString()

function highlight (key) {
  window._polymerNamespace_.unhighlight();
  window._polymerNamespace_.lastHighlightedKey = key;
  var element = window._polymerNamespace_.DOMCache[key];
  window._polymerNamespace_.prevOutline = element.style.outline;
  window._polymerNamespace_.prevBackgroundColor = element.style.backgroundColor;
  element.style.outline = '1px dashed red';
  element.style.backgroundColor = 'rgba(255,0,0,0.1)';
}

function unhighlight () {
  if (!window._polymerNamespace_.lastHighlightedKey) {
    return;
  }
  var element = window._polymerNamespace_.DOMCache[window._polymerNamespace_.lastHighlightedKey];
  element.style.outline = window._polymerNamespace_.prevOutline;
  element.style.backgroundColor = window._polymerNamespace_.prevBackgroundColor;
}

function scrollIntoView (key) {
  if (key in window._polymerNamespace_.DOMCache) {
    window._polymerNamespace_.DOMCache[key].scrollIntoView();
  }
}

function getPropPath (key, path) {
  var propPath = [];
  var indexMap = window._polymerNamespace_.indexToPropMap[key];
  path.forEach(function (el) {
    indexMap = indexMap[el];
    propPath.push(indexMap.__name__);
  });
  return propPath;
}

function resolveObject (key, path) {
  var obj = window._polymerNamespace_.DOMCache[key];
  var propPath = window._polymerNamespace_.getPropPath(key, path);
  propPath.forEach(function (el) {
    obj = obj[el];
  });
  return obj;
}

function changeProperty (key, path, newValue) {
  var prop = path.pop();
  var obj = window._polymerNamespace_.resolveObject(key, path);
  if (obj) {
    obj[prop] = newValue;
  }
}

function addToCache (obj, key) {
  window._polymerNamespace_.DOMCache[key] = obj;
}

function getIndexMapObject (key, path) {
  var start = window._polymerNamespace_.indexToPropMap[key];
  for (var i = 0; i < path.length; i++) {
    start = start[path[i]];
  }
  return start;
}

function addToIndexMap (propName, key, path) {
  var lastIndex = path.pop();
  var start = window._polymerNamespace_.getIndexMapObject(key, path);
  start[lastIndex] = {
    __name__: propName
  };
}

function removeFromIndexMap (key, path) {
  var lastIndex = path.pop();
  var start = window._polymerNamespace_.getIndexMapObject(key, path);
  var name = start.__name__;
  start[lastIndex] = {
    __name__: name
  };
}

function getDOMString () {
  window._polymerNamespace_.serializer = new window._polymerNamespace_.DOMSerializer();
  return {
    'data': window._polymerNamespace_.serializer.serializeDOMObject(document.body,
      function (domNode, converted) {
        window._polymerNamespace_.lastDOMKey++;
        window._polymerNamespace_.addToCache(domNode, window._polymerNamespace_.lastDOMKey);
        window._polymerNamespace_.indexToPropMap[window._polymerNamespace_.lastDOMKey] = {};
        converted.key = window._polymerNamespace_.lastDOMKey;
        var propList = converted.JSONobj.value;
        for (var i = 0; i < propList.length; i++) {
          var propName = propList[i].name;
          window._polymerNamespace_.addToIndexMap(propName, window._polymerNamespace_.lastDOMKey, [i]);
        }
      }
    )
  };
}

function getObjectString (key, path) {
  var obj = window._polymerNamespace_.resolveObject(key, path);
  var indexMap = window._polymerNamespace_.getIndexMapObject(key, path);
  return {
    'data': window._polymerNamespace_.serializer.
      serializeObject(obj, function (converted) {
        var propList = converted.value;
        for (var i = 0; i < propList.length; i++) {
          var propName = propList[i].name;
          indexMap[i] = {
            __name__: propName
          };
        }
      })
  };
}

function addObjectObserver (key, path) {
  var obj = window._polymerNamespace_.resolveObject(key, path);
  var indexMap = window._polymerNamespace_.getIndexMapObject(key, path);
  function processChanges (changes) {
    var processedChangeObject = {
      path: path,
      key: key,
      changes: []
    };
    function serializeCallback (converted) {
      var propList = converted.JSONobj.value;
      for (var i = 0; i < propList.length; i++) {
        var propName = propList[i].propName;
        indexMap[i] = {
          name: propName
        };
      }
    }
    for (var i = 0; i < changes.length; i++) {
      var change = changes[i];
      var summary = {
        name: change.name,
        type: change.type
      };
      if (change.type !== 'delete') {
        var wrappedObject = {
          value: change.object[change.name]
        };
        summary.object = window._polymerNamespace_.serializer.
          serializeObject(wrappedObject, serializeCallback);
      }
      processedChangeObject.changes.push(summary);
    }
    return JSON.stringify(processedChangeObject);
  }
  function observer (changes) {
    window.dispatchEvent(new CustomEvent('object-changed', {
      detail: processChanges(changes)
    }));
  }

    Object.observe(obj, observer);

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

function removeObjectObserver (key, path) {
  var obj = window._polymerNamespace_.resolveObject(key, path);
  var hashLocation = window._polymerNamespace_.observerCache[key];
  for (var i = 0; i < path.length; i++) {
    hashLocation = hashLocation[path[i]];
  }
  Object.unobserve(obj, hashLocation['__objectObserver__']);
}

function createCache() {
  window._polymerNamespace_.DOMCache = {};
  window._polymerNamespace_.indexToPropMap = {};
  // The key of the last DOM element added
  window._polymerNamespace_.lastDOMKey = 0;
}
