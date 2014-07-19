// Contains a class DOMJSONizer used to JSONize DOM tree, objects, properties

// TODO: Remove all logic that pertains to Polymer elements from here and pass them as callbacks

function DOMJSONizer () {
  function isPolymerElement (element) {
    return element && ('element' in element) && (element.element.localName === 'polymer-element');
  }

  // Polymer-specific stuff (to flag them differently)
  // Mostly taken from: http://www.polymer-project.org/docs/polymer/polymer.html#lifecyclemethods
  var polymerSpecificProps = {
    observe: true,
    publish: true,
    created: true,
    ready: true,
    attached: true,
    domReady: true,
    detached: true,
    attributeChanged: true
  };

  /**
  * Checks if a property is an acessor. obj.hasOwnProperty(prop) has to be true.
  */
  function propHasAccessor (obj, prop) {
     var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
     if (!descriptor) {
      console.error(prop);
     }
     return !!descriptor.set || !!descriptor.get;
  }

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
        value: e.message,
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
  * Converts an object to JSON only one level deep
  */
  function JSONize (obj, filter) {

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
          var props = getPolymerProps(proto);
          props = props.filter(checkAdded);
          props.forEach(addToAddedProps);
          for (var i = 0; i < props.length; i++) {
            copyProperty(proto, element, destObj, props[i]);
            // Add a flag to show Polymer implementation properties separately
            if (props[i] in polymerSpecificProps) {
              destObj[destObj.length - 1].polymer = true;
            }
            // Add a flag to show that published properties differently
            if (props[i] in element.publish) {
              destObj[destObj.length - 1].published = true;
            }
          }
          proto = proto.__proto__;
        }
        destObj.sort(function (a, b) {
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
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
      // TODO: `__proto__` ?
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

  function isScriptOrStyle (el) {
    return el && (el.tagName === 'SCRIPT' || el.tagName === 'STYLE');
  }
  /**
  * Does a deep light DOM exploration.
  * Puts child tree under <shadow> and <content> tags if found
  * Returned object looks like:
  * {
  *   tagName: <tagName>,
  *   children: <list of other such objects>,
  *   isLightDOMTree: true
  * }
  * unless callback does something else to it
  */
  function exploreLightDOM (root, callback) {
    var res = {
      children: [],
      tagName: root.tagName.toLowerCase(),
      isLightDOMTree: true
    };
    // Call the callback with the DOM node, the to-be-converted object
    // and true to mean that it was found in the light DOM exploration
    callback && callback(root, res, true);
    if (root.tagName === 'CONTENT') {
      // <content> must get replaced by what gets distributed into it
      var children = root.getDistributedNodes();
      for (var j = 0; j < children.length; j++) {
        if ('tagName' in children[j]) {
          res.children.push(exploreLightDOM(children[j], callback));
        }
      }
    } else if (root.tagName === 'SHADOW') {
      // <shadow> must get replaced by stuff from older shadow root
      var children = getComposedDOMChildren(root);
      for (var j = 0; j < children.length; j++) {
        res.children.push(exploreLightDOM(children[j], callback));
      }
    } else {
      for (var i = 0; i < root.children.length; i++) {
        if (root.children[i] && 'tagName' in root.children[i]) {
          if (!isScriptOrStyle(root.children[i])) {
            res.children.push(exploreLightDOM(root.children[i], callback));
          }
        }
      }
    }
    return res;
  }
  /**
  * Gets the children of root in the composed DOM (Shadow DOM + Light DOM)
  */
  function getComposedDOMChildren (root) {
    if (root.tagName === 'CONTENT') {
      // <content> must get replaced by what gets distributed into it
      var children = [];
      var distributedNodes = root.getDistributedNodes();
      for (var j = 0; j < distributedNodes.length; j++) {
        if ('tagName' in distributedNodes[j]) {
          children.push(distributedNodes[j]);
        }
      }
      return children;
    }
    if (root.tagName === 'SHADOW') {
      // <shadow> must get replaced by stuff from older shadow root
      var children = [];
      var shadowRoot = root;
      while (!shadowRoot.host) {
        shadowRoot = shadowRoot.parentNode;
      }
      if (!shadowRoot.olderShadowRoot) {
        // This is a mistake in the host page. A <shadow> was used
        // when there is no olderShadowRoot.
        // TODOD: We should warn the user somehow.
        return [];
      }
      return getComposedDOMChildren(shadowRoot.olderShadowRoot);
    }
    if (root.shadowRoot) {
      root = root.shadowRoot;
    }
    var children = [];
    for (var i = 0; i < root.children.length; i++) {
      if ('tagName' in root.children[i]) {
        children.push(root.children[i]);
      }
    }
    return children;
  }

  /**
  * JSONizes a DOM element
  * Return object looks like this:
  * {
  *   tagName: <tag-name>,
  *   key: <unique-key>,
  *   lightDOMTree: <what exploreLightDOM returns>
  *   children: [<more such objects>]
  * }
  * unless callback does anything else to it.
  * @callback: is executed on every DOM element found
  */
  this.JSONizeDOMObject = function (root, callback) {
    function traverse (root) {
      var res = {};
      if ('tagName' in root) {
        res.tagName = root.tagName.toLowerCase();
      } else {
        console.error(root);
        throw 'tagName is a required property';
      }
      if (!root || isScriptOrStyle(root)) {
        // We don't show script and style tags
        return null;
      }
      callback && callback(root, res);
      res.children = [];
      var composedDOMChildren = getComposedDOMChildren(root);
      // composedDOMChildren is an array of elements found at a level immediately below this
      // in the composed tree (which we are sure, came from the shadow DOM and not light DOM)
      for (var i = 0; i < composedDOMChildren.length; i++) {
        if (composedDOMChildren[i]) {
          var child = traverse(composedDOMChildren[i]);
          if (child) {
            res.children.push(child);
          }
        }
      }
      // With everything that is in the composed DOM tree at root being traversed through
      // we can be sure `callback` has dealt with all the rendered elements.
      res.lightDOMTree = exploreLightDOM(root, callback);
      return res;
    }
    return traverse(root);
  };

  /**
  * JSONize any object (or function) one level deep.
  * It checks for only own properties.
  * Pass in a wrapped object and unwrap later if passing a non-object.
  * @callback: this is called once just before JSONizing the newly created one-level
  *   deep object mirror
  * Return object looks like this:
  * {
  *   type: 'object',
  *   name: 'Root',
  *   value: [
  *     {
  *       type: <type>,
  *       name: <name>,
  *       value: <value>, (empty array if property is an object)
  *       hasAccessor: <true|false>,
  *       error: <true|false> (if there was an error while executing the getter (if there was one))
  *     },
  *     // More such objects for each property in the passed object
  *   ]
  * }
  */
  this.JSONizeObject = function (obj, callback, filter) {
    var res = JSONize(obj, filter);
    callback && callback(res);
    return res;
  };

  /**
  * Takes an object and a property name and JSONizes just that property's value.
  * It returns a wrapped object with the same property containing the required property.
  * Returns an object that looks like this:
  * {
  *   type: 'object',
  *   name: 'Root',
  *   value: [
  *     // `value` array size is 1 and just contains the property asked for
  *     {
  *       name: <prop-name>,
  *       ...
  *     }
  *   ]
  * }
  */
  this.JSONizeProperty = function (prop, obj) {
    // Get to the object in the prototype chain that actually contains the property
    var actualObject = obj;
    while (actualObject) {
      if (actualObject.hasOwnProperty(prop)) {
        break;
      }
      actualObject = actualObject.__proto__;
    }
    var res = {
      name: 'Root',
      type: 'object',
      value: []
    };
    // Add the property to this wrapper object
    copyProperty(actualObject, obj, res.value, prop);
    if (isPolymerElement(obj)) {
      // If it is a Polymer element, we may need to add a few flags to it
      if (prop in polymerSpecificProps) {
        res.value[0].polymer = true;
      }
      if (prop in obj.publish) {
        res.value[0].published = true;
      }
    }
    return res;
  };
}
