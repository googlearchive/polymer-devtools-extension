function DOMSerializer () {
  var addedObjects = [];
  var unwantedClasses = [Function, HTMLElement, Document, Window];
  function isPolymerElement (node) {
    return node && ('element' in node) && (node.element.localName === 'polymer-element');
  }
  function JSONize (obj) {
    function isUnrequired (obj) {
      for (var i = 0; i < unwantedClasses.length; i++) {
        if (obj instanceof unwantedClasses[i]) {
          return true;
        }
      }
      if (typeof obj === 'object' && alreadyAdded(obj)) {
        return true;
      }
      return false;
    }
    function alreadyAdded (obj) {
      for (var i = 0; i < addedObjects.length; i++) {
        if (obj === addedObjects[i]) {
          return true;
        }
      }
      return false;
    }
    function copyProperty (oldObj, newObj, prop) {
      if (isUnrequired(oldObj[prop])) {
        return;
      }
      if (oldObj[prop] === null) {
        newObj[prop] = {
          type: 'null',
          value: oldObj[prop]
        };
      } else if (typeof oldObj[prop] === 'string') {
        newObj[prop] = {
          type: 'string',
          value: oldObj[prop]
        };
      } else if (typeof oldObj[prop] === 'number') {
        newObj[prop] = {
          type: 'number',
          value: oldObj[prop]
        };
      } else if (typeof oldObj[prop] === 'boolean') {
        newObj[prop] = {
          type: 'boolean',
          value: oldObj[prop]
        };
      } else if (typeof oldObj[prop] === 'object' &&
        !(oldObj instanceof Array)) {
        addedObjects.push(oldObj[prop]);
        newObj[prop] = {
          type: 'object',
          value: {}
        };
        explore(oldObj[prop], newObj[prop].value);
      } else if (typeof oldObj[prop] === 'object') {
        addedObjects.push(oldObj[prop]);
        newObj[prop] = {
          type: 'array',
          length: oldObj[prop].length,
          value: []
        };
        for (var i = 0; i < oldObj[prop].length; i++) {
          newObj[prop].value.push(explore(oldObj[prop], newObj[prop].value));
        }
      }
      newObj[prop].name = prop;
    }
    function explore (node, obj) {
      if (isPolymerElement(node)) {
        for (var key in node.__proto__) {
          if (key == 'foo') {
            console.log(node[key]);
          }
          try {
            copyProperty(node, obj, key);
          } catch (e) {

          }
        }
      }
      if ('tagName' in node) {
        copyProperty(node, obj, 'tagName');
      }
    }
    var res = {
      name: '/',
      type: 'object',
      value: {}
    };
    explore(obj, res.value);
    return res;
  }

  function createCache() {
    window._polymerNamespace_.DOMCache = {};
    window._polymerNamespace_.lastDOMKey = 0;
    window._polymerNamespace_.serializer = this;
  }
  function addToCache(obj) {
    window._polymerNamespace_.DOMCache[obj.key] = obj;
  }

  this.serialize = function (root) {
    createCache();
    addedObjects = [];
    function traverse (root) {
      var res = {};
      res.JSONobj = JSONize(root);
      res.key = window._polymerNamespace_.lastDOMKey++;
      root.key = res.key;
      addToCache(root);
      if (isPolymerElement(root)) {
        root = root.shadowRoot;
        res.isPolymer = true;
      }
      res.children = [];
      if (!root) {
        return res;
      }
      for (var i = 0; i < root.children.length; i++) {
        if (root.children[i]) {
          res.children.push(traverse(root.children[i]));
        }
      }
      return res;
    }
    return JSON.stringify(traverse(root));
  };

  this.workOnElement = function (key, callback) {
    if (!(key in window._polymerNamespace_.DOMCache)) {
      throw 'Invalid node key request';
    }
    callback.call(window._polymerNamespace_.DOMCache[key], window._polymerNamespace_.DOMCache[key]);
  };
}
