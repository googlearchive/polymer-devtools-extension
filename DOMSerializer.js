function DOMSerializer () {
  function isPolymerElement (element) {
    return element && ('element' in element) && (element.element.localName === 'polymer-element');
  }
  function isCustomElement (element) {
    return element.shadowRoot && 
      element.localName.indexOf('-') !== -1 || element.getAttribute('is');
  }

  /**
  * Checks if a property is an acessor
  */
  function propHasAccessor (obj, prop) {
     var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
     if (!descriptor) {
      console.log(prop);
      console.log(obj);
     }
     return !!descriptor.set || !!descriptor.get;
  }
  /**
  * Converts an object to JSON only one level deep
  */
  function JSONize (obj, filter) {

    /**
    * Copies a property from oldObj to newObj and adds some metadata.
    * protoObject is the exact object in the chain where the prop is present.
    * It is necessary to determine if the prop is an accessor or not.
    */
    function copyProperty (protoObject, oldObj, newObj, prop) {
      try {
        oldObj[prop];
      } catch (e) {
        // We encountered an error trying to read the property.
        // It must be a getter that is failing.
        newObj.push({
          type: 'error',
          hasAccessor: true,
          error: true,
          value: error.message,
          name: prop
        });
        return;
      }
      if (oldObj[prop] === null) {
        newObj.push({
          type: 'null',
          hasAccessor: false,
          value: 'null',
          name: prop
        });
      } else if (typeof oldObj[prop] === 'string' ||
          typeof oldObj[prop] === 'number' ||
          typeof oldObj[prop] === 'boolean') {
        newObj.push({
          type: typeof oldObj[prop],
          hasAccessor: propHasAccessor(protoObject, prop),
          value: oldObj[prop].toString(),
          name: prop
        });
      } else if (((typeof oldObj[prop] === 'object' &&
          !(oldObj[prop] instanceof Array)) ||
          typeof oldObj[prop] === 'function')) {
        newObj.push({
          type: typeof oldObj[prop],
          hasAccessor: propHasAccessor(protoObject, prop),
          value: [],
          name: prop
        });
      } else if (typeof oldObj[prop] === 'object') {
        newObj.push({
          type: 'array',
          hasAccessor: propHasAccessor(protoObject, prop),
          length: oldObj[prop].length,
          value: [],
          name: prop
        });
      } else {
        newObj.push({
          type: 'undefined',
          hasAccessor: false,
          value: 'undefined',
          name: prop
        });
      }
    }

    /**
    * Gets the Polymer-specific *own* properties of an object
    */
    function getPolymerProps (element) {
      var props = Object.getOwnPropertyNames(element);
      if (filter) {
        props = props.filter(filter);
      }
      return props;
    }

    /**
    * Explores a Polymer element for properties
    */
    function explorePolymerObject (element, destObj) {
      var addedProps = {};
      function checkAdded (el) {
        return !(el in addedProps);
      }
      function addToAddedProps (el) {
        addedProps[el] = true;
      }
      if (isPolymerElement(element)) {
        var proto = element;
        while (proto && !Polymer.isBase(proto)) {
          var props = getPolymerProps(proto).sort();
          props = props.filter(checkAdded);
          props.forEach(addToAddedProps);
          for (var i = 0; i < props.length; i++) {
            copyProperty(proto, element, destObj, props[i]);
          }
          proto = proto.__proto__;
        }
      }
    }

    /**
    * Explores an object (non-Polymer) for properties
    */
    function exploreObject (obj, destObj) {
      var props = Object.getOwnPropertyNames(obj).sort();
      for (var i = 0; i < props.length; i++) {
        if (!filter || filter(props[i])) {
          try {
            copyProperty(obj, obj, destObj, props[i]);
          } catch (e) {
            // TODO: Some properties throw when read. Find out more.
          }
        }
      }
      // copyProperty(Object.prototype, obj, destObj, '__proto__');
    }

    /**
    * Explores an array for proerties
    */
    function exploreArray (arr, destObj) {
      for (var i = 0; i < arr.length; i++) {
        try {
          copyProperty(arr, arr, destObj, i);
        } catch (e) {
          // TODO: Some properties throw when read. Find out more.
        }
      }
    }

    var res = {
      name: 'Root',
      value: []
    };
    if (isPolymerElement(obj)) {
      res.type = 'object';
      explorePolymerObject(obj, res.value);
    } else {
      if (obj instanceof Array) {
        res.type = 'array';
        exploreArray(obj, res.value);
      } else if (typeof obj === 'object' ||
          typeof obj === 'function') {
        res.type = typeof obj;
        exploreObject(obj, res.value);
      }
    }
    return res;
  }

  /**
  * Gets the composed DOM (Shadow DOM + Light DOM) of an element
  */
  function getComposedDOM (root) {
    if (root.shadowRoot) {
      root = root.shadowRoot;
    }
    var children = [];
    for (var i = 0; i < root.children.length; i++) {
      if (root.children[i].tagName === 'CONTENT') {
        children.push.apply(children, root.children[i].getDistributedNodes());
      } else if (root.children[i].tagName === 'SHADOW') {
        children.push.apply(children, getComposedDOM(root.olderShadowRoot));
      } else {
        children.push(root.children[i]);
      }
    }
    return children.filter(function (node) {
      // Filter out non-element nodes
      return 'tagName' in node;
    });
  }

  /**
  * Serializes a DOM element
  * Return object looks like this:
  * {
  *   tagName: <tag-name>,
  *   key: <unique-key>,
  *   isPolymer: <true|false>,
  *   children: [<more such objects>]
  * }
  * `callback` is execuated on every DOM element found
  * `isPolymer` is supposed to tell if an element is a Polymer element
  */
  this.serializeDOMObject = function (root, callback, isPolymer) {
    function traverse (root) {
      var res = {};
      if ('tagName' in root) {
        res.tagName = root.tagName.toLowerCase();
      } else {
        throw 'tagName is a required property';
      }
      if (root.tagName === 'SCRIPT') {
        return null;
      }
      callback && callback(root, res);
      if (isPolymerElement(root) ||
        (root.tagName === 'TEMPLATE' && root.model)) {
        res.isPolymer = true;
      }
      var children = getComposedDOM(root);
      res.children = [];
      if (!root) {
        return res;
      }
      for (var i = 0; i < children.length; i++) {
        if (children[i]) {
          var child = traverse(children[i]);
          if (child) {
            res.children.push(child);
          }
        }
      }
      return res;
    }
    return JSON.stringify(traverse(root));
  };

  /**
  * Serializes any object (or function) one level deep.
  * It checks for only own properties.
  * Pass in a wrapped object and unwrap later if passing a non-object.
  * Return object looks like this:
  * [
  *   {
  *     type: <type>,
  *     name: <name>,
  *     value: <value>, (empty array if property is an object)
  *     hasAccessor: <true|false>,
  *     error: <true|false> (if there was an error while executing the getter (if there was one))
  *   },
  *   // More such objects for each property in the passed object
  * ]
  */ 
  this.serializeObject = function (obj, callback, filter) {
    var res = JSONize(obj, filter);
    callback && callback(res);
    return JSON.stringify(res);
  };
}
