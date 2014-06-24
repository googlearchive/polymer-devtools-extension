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
  var prop = window._polymerNamespace_.getPropPath(key, path).pop();
  path.pop();
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

function addToSubIndexMap (indexMap, propName) {
  indexMap.__lastIndex__ = '__lastIndex__' in indexMap ? (indexMap.__lastIndex__ + 1) : 0;
  indexMap[indexMap.__lastIndex__] = {
    __name__: propName
  };
  indexMap['name-' + propName] = indexMap.__lastIndex__;
}

function removeFromSubIndexMap (indexMap, index) {
  var propName = indexMap[index].__name__;
  for (var i = index + 1; i <= indexMap.__lastIndex__; i++) {
    indexMap[i - 1] = indexMap[i];
  }
  delete indexMap['name-' + propName];
  delete indexMap[indexMap.__lastIndex__--];
}

function addToIndexMap (propName, key, path) {
  var lastIndex = path.pop();
  var start = window._polymerNamespace_.getIndexMapObject(key, path);
  start[lastIndex] = {
    __name__: propName
  };
  start['name-' + propName] = propName;
  start.__lastIndex__ = start.__lastIndex__ ? (start.__lastIndex__ + 1) : 0;
}

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

function getDOMString () {
  window._polymerNamespace_.serializer = new window._polymerNamespace_.DOMSerializer();
  return {
    'data': window._polymerNamespace_.serializer.serializeDOMObject(document.body,
      function (domNode, converted) {
        window._polymerNamespace_.lastDOMKey++;
        window._polymerNamespace_.addToCache(domNode, window._polymerNamespace_.lastDOMKey);
        window._polymerNamespace_.indexToPropMap[window._polymerNamespace_.lastDOMKey] = {};
        converted.key = window._polymerNamespace_.lastDOMKey;
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
          window._polymerNamespace_.addToSubIndexMap(indexMap, propName);
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
    for (var i = 0; i < changes.length; i++) {
      var change = changes[i];
      var summary = {
        index: indexMap['name-' + change.name],
        type: change.type,
        name: change.name
      };
      switch (change.type) {
        case 'update':
          var wrappedObject = {
            value: change.object[change.name]
          };
          summary.object = window._polymerNamespace_.serializer.
            serializeObject(wrappedObject);
          break;
        case 'delete':
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
