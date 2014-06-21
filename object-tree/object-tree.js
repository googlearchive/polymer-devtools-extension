(function () {
  /**
  * Tells if the new value of the field is valid or not
  */
  var EXPAND_BTN_IMAGE = '../res/expand.png';
  var COLLAPSE_BTN_IMAGE = '../res/collapse.png';
  var BLANK_IMAGE = '../res/blank.png';
  function isFieldValueValid (val) {
    var validValues = ['true', 'false', 'undefined', 'null'];
    if ((validValues.indexOf(val) !== -1) ||
      (val.length >= 2 &&
      (val[0] === '"' && val[val.length - 1] === '"') ||
      (val[0] === '\'' && val[val.length - 1] === '\'')) ||
      !isNaN(parseInt(val, 10))) {
      return true;
    }
    return false;
  }
  Polymer('object-tree', {
    indent: 0,
    collapsed: true,
    baseWidth: 14,
    expandBtnImg: BLANK_IMAGE,
    // Value of the property (to the right)
    contentText: '',
    // Text of the property (to the left)
    labelText: '',
    // Meta-information like <object> or <array>
    typeText: '',
    // Some keys are objects/arrays and don't need an immediate value
    valueNeeded: false,
    // Only objects and arrays need the expand button
    expandBtnNeeded: false,
    expandBtnNeededChanged: function (oldValue, newValue) {
      if (newValue) {
        this.expandBtnImg = this.collapsed ? EXPAND_BTN_IMAGE : COLLAPSE_BTN_IMAGE;
      } else {
        this.expandBtnImg = BLANK_IMAGE;
      }
    },
    collapsedChanged: function (oldValue, newValue) {
      if (this.expandBtnNeeded) {
        this.expandBtnImg = newValue ? EXPAND_BTN_IMAGE : COLLAPSE_BTN_IMAGE;
      }
    },
    ready: function () {
      this.childElements = [];
      this.childElementsMap = {};
      this.$.childrenContent.style.marginLeft = this.indent + this.baseWidth + 'px';
      // When the editable-field changes
      this.addEventListener('field-changed', function (event) {
        var newValue = event.detail.newValue;
        var oldValue = event.detail.oldValue;
        var path = this.path;
        // Stop propagation since this will fire another event
        event.stopPropagation();
        if (!isFieldValueValid(newValue)) {
          this.$.editableLabel.text = oldValue;
          return;
        }
        // Fire an event with all the information
        this.fire('property-changed', {
          path: path,
          value: newValue
        });
      });
    },
    addChild: function (element) {
      this.childElements.push(element);
      this.childElementsMap[element.labelText] = element;
      this.$.childrenContent.appendChild(element);
    },
    /**
    * Remove all children from the tree
    */
    removeChildren: function () {
      while (this.$.childrenContent.firstChild) {
        this.$.childrenContent.removeChild(this.$.childrenContent.firstChild);
      }
      this.childElements = [];
      this.childElementsMap = {};
    },
    /**
    * Add a property as a child
    */
    addChildProp: function (propObj, path) {
      var child = new ObjectTree();
      child.init(propObj, path);
      this.addChild(child);
    },
    /**
    * Empties the object-tree
    */
    empty: function () {
      this.labelText = '';
      this.typeText = '';
      this.valueNeeded = false;
      this.collapsed = true;
      this.expandBtnNeeded = false;
      this.removeChildren();
    },
    /**
    * Init the node with an object
    */
    init: function (obj, path) {
      this.labelText = obj.name;
      this.path = path;
      if (obj.type === 'object' || obj.type === 'array' || obj.type === 'function') {
        this.typeText = '<' + obj.type + '>';
        this.expandBtnNeeded = true;
      } else {
        this.valueNeeded = true;
        this.contentText = obj.value;
        if (obj.type === 'string') {
          this.contentText = '"' + this.contentText + '"';
        }
      }
      if (obj.hasAccessor) {
        this.typeText += ' <accessor>';
      }
    },
    /**
    * Pre-populates the object-tree with a given tree (1 level deep)
    */
    initFromObjectTree: function (tree) {
      this.empty();
      this.labelText = tree.name;
      this.collapsed = false;
      this.typeText = '<' + tree.type + '>';
      for (var key in tree.value) {
        if (tree.value.hasOwnProperty(key)) {
          this.addChildProp(tree.value[key], [key]);
        }
      }
    },
    /**
    * Collapse/Uncollapse
    */
    toggle: function () {
      if (!this.expandBtnNeeded) {
        return;
      }
      this.collapsed = !(this.collapsed);
      var that = this;
      if (this.collapsed) {
        this.removeChildren();
        this.fire('object-collapse', {
          path: that.path,
          treeNode: that
        });
      } else {
        this.fire('object-expand', {
          path: that.path,
          treeNode: that
        });
      }
    },
    /**
    * Get child node led to by following path
    */
    getChildNode: function (path) {
      var node = this;
      for (var i = 0; i < path.length; i++) {
        node = node.childElementsMap[path[i]];
      }
      return node;
    }
  });
})();
