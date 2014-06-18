(function () {
  function newExpandBtnState (present) {
    return present === '+' ? '-' : '+';
  }
  /**
  * Tells if the new value of the field is valid or not
  */
  function isFieldValueValid (val) {
    var validValues = ['true', 'false', 'undefined', 'null'];
    if ((validValues.indexOf(val) !== -1) ||
      (val.length >= 2 &&
      (val[0] === '"' && val[val.length - 1] === '"') ||
      (val[0] === '\'' && val[val.length - 1] === '\''))) {
      return true;
    }
    return false;
  }
  Polymer('object-tree', {
    indent: 0,
    collapsed: true,
    baseWidth: 10,
    expandBtnText: '+',
    // Value of the property (to the right)
    contentText: '',
    // Text of the property (to the left)
    labelText: '',
    // Meta-information like <object> or <array>
    typeText: '',
    // Some keys are objects/arrays and don't need an immediate value
    valueNeeded: false,
    // Only objects and arrays need the expand button
    expandBtnNeeded: true,
    expandBtnNeededChanged: function (oldValue, newValue) {
      if (newValue) {
        this.expandBtnText = this.collapsed ? '+' : '-';
      } else {
        this.expandBtnText = ' ';
      }
    },
    ready: function () {
      this.childElements = [];
      this.$.childrenContent.style.marginLeft = this.indent + this.baseWidth + 'px';
      // When the editable-field changes
      this.addEventListener('field-changed', function (event) {
        var newValue = event.detail.newValue;
        var oldValue = event.detail.oldValue;
        var prop = this.labelText;
        // Stop propagation since this will fire another event
        event.stopPropagation();
        if (!isFieldValueValid(newValue)) {
          this.$.editableLabel.text = oldValue;
          return;
        }
        // Fire an event with all the information
        this.fire('property-changed', {
          prop: prop,
          value: newValue
        });
      });
      this.addEventListener('object-toggle', function (event) {
        event.stopPropagation();
        this.fire('object-toggle', {
          key: event.detail.key + '["' + this.labelText + '"]',
          expand: event.detail.expand
        };
      });
    },
    addChild: function (element) {
      this.childElements.push(element);
      this.$.childrenContent.appendChild(element);
    },
    /**
    * Empties the object-tree
    */
    empty: function () {
      this.labelText = '';
      this.typeText = '';
      this.valueNeeded = false;
      this.expandBtnText = '+';
      this.collapsed = true;
      for (var i = 0; i < this.childElements.length; i++) {
        this.childElements[i].empty();
        this.$.childrenContent.innerHTML = '';
      }
      delete this.childElements;
      this.childElements = [];
    },
    /**
    * Pre-populates the object-tree with a given tree
    */
    initFromObjectTree: function (tree) {
      this.empty();
      this.labelText = tree.name;
      if (tree.type === 'object' || tree.type === 'array') {
        this.typeText = '<' + tree.type + '>';
      } else {
        this.expandBtnNeeded = false;
        this.valueNeeded = true;
        this.contentText = tree.value;
        if (tree.type === 'string') {
          this.contentText = '"' + this.contentText + '"';
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
      if (this.childElements.length === 0) {
        return;
      }
      this.collapsed = !(this.collapsed);
      this.expandBtnText = newExpandBtnState(this.expandBtnText);
      for (var i = 0; i < this.childElements.length; i++) {
        if (this.collapsed) {
          this.childElements[i].$.content.style.display = 'none';
        } else {
          this.childElements[i].$.content.style.display = 'block';
        }
      }
      this.fire('object-toggle', {
        key: '["' + this.labelText + '"]',
        expand: !this.collapsed
      });
    }
  });
})();
