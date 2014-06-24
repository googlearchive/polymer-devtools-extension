function DOMSerializer () {
  function isPolymerElement (element) {
    return element && ('element' in element) && (element.element.localName === 'polymer-element');
  }
  function isCustomElement (element) {
    return element.shadowRoot && 
      element.localName.indexOf('-') !== -1 || element.getAttribute('is');
  }
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
  function JSONize (obj) {

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
      var props = Object.getOwnPropertyNames(element).filter(function (n) {
        return n[0] !== '_' && n.slice(-1) !== '_' && !getPolymerProps.blacklist[n];
      });
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
      reflect: true,

      onautocomplete: true,
      onautocompleteerror: true,
      ontoggle: true,
      hasBeenAttached: true
    };

    /**
    * Explores a Polymer element for properties
    */
    function explorePolymerObject (element, destObj) {
      if (isPolymerElement(element)) {
        var proto = element;
        while (proto && !Polymer.isBase(proto)) {
          var props = getPolymerProps(proto).sort();
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
        try {
          copyProperty(obj, obj, destObj, props[i]);
        } catch (e) {
          // TODO: Some properties throw when read. Find out more.
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
  this.serializeDOMObject = function (root, callback) {
    function traverse (root) {
      var res = {};
      if ('tagName' in root) {
        res.tagName = root.tagName.toLowerCase();
      } else {
        throw 'tagName is a required property';
      }
      callback && callback(root, res);
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
    return JSON.stringify(traverse(root));
  };

  this.serializeObject = function (obj, callback) {
    var res = JSONize(obj);
    callback && callback(res);
    return JSON.stringify(res);
  };
}
