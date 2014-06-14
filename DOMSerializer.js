function DOMSerializer () {
  // To store objects added sp far.
  var addedObjects = [];
  // TODO: improve unwantedClasses
  var unwantedClasses = [Function, HTMLElement, Document, Window];
  function isPolymerElement (node) {
    return node && ('element' in node) && (node.element.localName === 'polymer-element');
  }
  /**
  * Converts an object to JSON by removing cyclical references
  */
  function JSONize (obj) {
    /**
    * Checks if the property is unrequired in the obj.
    * prop has to be an own property of obj
    */
    function isUnrequired (obj, prop) {
      var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
      if (descriptor.set || descriptor.get) {
        // We don't want to show properties with setters since
        // we can't be sure what they'll be after an edit
        return true;
      }
      for (var i = 0; i < unwantedClasses.length; i++) {
        if (obj[prop] instanceof unwantedClasses[i]) {
          return true;
        }
      }
      return false;
    }
    function alreadyAdded (obj) {
      return addedObjects.indexOf(obj) !== -1;
    }

    /**
    * Copies a property from oldObj to newObj and add some metadata
    */
    function copyProperty (oldObj, newObj, prop) {
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

    /**
    * Gets the Polymer-specific properties of an object
    */
    function getPolymerProps (element) {
      var props = [];
      var proto = element.__proto__;
      while (proto && !Polymer.isBase(proto)) {
        props = props.concat(Object.getOwnPropertyNames(proto).filter(function(n) {
          return n[0] !== '_' && n.slice(-1) !== '_' && !getPolymerProps.blacklist[n] &&
            !isUnrequired(proto, n);
        }));
        proto = proto.__proto__;
      }
      return props;
    }
    // TODO: Improve blacklist
    getPolymerProps.blacklist = {resolvePath: 1};

    /**
    * Explores the object for proerties
    */
    function explore (element, obj) {
      if (isPolymerElement(element)) {
        var props = getPolymerProps(element);
        for (var i = 0; i < props.length; i++) {
          if (!alreadyAdded(element[props[i]])) {
            copyProperty(element, obj, props[i]);
          }
        }
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

  /**
  * Create a store for caching DOM elements
  */
  function createCache() {
    window._polymerNamespace_.DOMCache = {};
    // The key of the last DOM element added
    window._polymerNamespace_.lastDOMKey = 0;
    window._polymerNamespace_.serializer = this;
  }
  function addToCache(obj) {
    window._polymerNamespace_.DOMCache[obj.key] = obj;
  }

  /**
  * Serializes a DOM element
  * Return object looks like this:
  * {
  *   JSONObj: {
  *     <prop>: {
  *       type: <type>,
  *       name: <name>,
  *       value: <value>
  *     }
  *   },
  *   tagName: <tag-name>,
  *   key: <unique-key>,
  *   isPolymer: <true|false>,
  *   children: [<more such objects>]
  * }
  */
  this.serialize = function (root) {
    createCache();
    addedObjects = [];
    function traverse (root) {
      var res = {};
      res.JSONobj = JSONize(root);
      if ('tagName' in root) {
        res.tagName = root.tagName;
      } else {
        throw 'tagName is a required property';
      }
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
