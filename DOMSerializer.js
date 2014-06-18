function DOMSerializer () {
  // TODO: improve unwantedClasses
  var unwantedClasses = [Function];
  function isPolymerElement (element) {
    return element && ('element' in element) && (element.element.localName === 'polymer-element');
  }
  function isCustomElement (element) {
    return element.shadowRoot && 
      element.localName.indexOf('-') !== -1 || element.getAttribute('is');
  }
  /**
  * Converts an object to JSON only one level deep
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
        !(oldObj[prop] instanceof Array)) {
        addedObjects.push(oldObj[prop]);
        newObj[prop] = {
          type: 'object',
          value: {}
        };
        // explore(oldObj[prop], newObj[prop].value);
      } else if (typeof oldObj[prop] === 'object') {
        addedObjects.push(oldObj[prop]);
        newObj[prop] = {
          type: 'array',
          length: oldObj[prop].length,
          value: []
        };
        /*for (var i = 0; i < oldObj[prop].length; i++) {
          newObj[prop].value.push(explore(oldObj[prop], newObj[prop].value));
        }*/
      } else {
        newObj[prop] = {
          type: 'undefined',
          value: oldObj[prop]
        };
      }
      newObj[prop].name = prop;
    }

    /**
    * Gets the Polymer-specific properties of an object
    */
    function getPolymerProps (element) {
      var props = [];
      var proto = element;
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
    getPolymerProps.blacklist = {
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
      reflect: true
    };

    /**
    * Explores a Polymer element for proerties
    */
    function explorePolymerObject (element, destObj) {
      if (isPolymerElement(element)) {
        var props = getPolymerProps(element);
        for (var i = 0; i < props.length; i++) {
          copyProperty(element, destObj, props[i]);
        }
      }
    }
    /**
    * Explores an object (non-Polymer) for proerties
    */
    function exploreObject (obj, destObj) {
      var props = Object.getOwnPropertyNames(obj);
      for (var i = 0; i < props.length; i++) {
        copyProperty(obj, destObj, props[i]);
      }
    }

    var res = {
      name: '/',
      type: 'object',
      value: {}
    };
    if (isPolymerElement(obj)) {
      explorePolymerObject(obj, res.value);
    } else {
      exploreObject(obj, res.value);
    }
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
  function addToCache (obj) {
    window._polymerNamespace_.DOMCache[obj.key] = obj;
  }
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
  this.serializeDOMObject = function (root) {
    createCache();
    addedObjects = [];
    function traverse (root) {
      var res = {};
      if ('tagName' in root) {
        res.tagName = root.tagName;
      } else {
        console.log(root);
        throw 'tagName is a required property';
      }
      res.JSONobj = JSONize(root);
      res.key = window._polymerNamespace_.lastDOMKey++;
      root.key = res.key;
      addToCache(root);
      if (isPolymerElement(root)) {
        res.isPolymer = true;
      }
      var children = getComposedDOM(root);
      res.children = [];
      if (!root) {
        return res;
      }
      for (var i = 0; i < children.length; i++) {
        if (children[i]) {
          res.children.push(traverse(children[i]));
        }
      }
      return res;
    }
    console.log(traverse(root));
    return JSON.stringify(traverse(root));
  };

  this.serializeObject = function (obj) {
    return JSON.stringify(JSONize(obj));
  };
}
