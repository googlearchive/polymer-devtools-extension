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

function resolveObject (key, path) {
  var obj = window._polymerNamespace_.DOMCache[key];
  path.forEach(function (el) {
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

function getDOMString () {
  window._polymerNamespace_.serializer = new window._polymerNamespace_.DOMSerializer();
  return {
    'data': window._polymerNamespace_.serializer.serializeDOMObject(document.body)
  };
}

function getObjectString (key, path) {
  var obj = window._polymerNamespace_.resolveObject(key, path);
  return {
    'data': window._polymerNamespace_.serializer.
      serializeObject(obj)
  };
}
