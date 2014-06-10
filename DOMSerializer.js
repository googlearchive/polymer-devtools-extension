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
      if (alreadyAdded(obj)) {
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
      if (typeof oldObj[prop] === 'string') {
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
    }
    function explore (node, obj) {
      if (isPolymerElement(node)) {
        for (var key in node.__proto__) {
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
    var res = {};
    explore(obj, res);
    return res;
  }

  this.serialize = function (root) {
    addedObjects = [];
    function traverse (root) {
      var res = JSONize(root);
      if (isPolymerElement(root)) {
        root = root.shadowRoot;
        res.isPolymer = true;
      }
      res.children = [];
      for (var i = 0; i < root.children.length; i++) {
        res.children.push(traverse(root.children[i]));
      }
      return res;
    }
    console.log(traverse(root));
    return JSON.stringify(traverse(root));
  };
}
