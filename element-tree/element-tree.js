(function () {
  var COLOR_POLYMER_SELECTED = '#cdcdc1';
  var COLOR_POLYMER_UNSELECTED = '#eeeee0';

  function newExpandBtnState(present) {
    return present === '>' ? 'v' : '>';
  }

  function setColor (tree, color) {
    tree.$.name.style.backgroundColor = color;
  }

  Polymer('element-tree', {
    indent: 0,
    collapsed: false,
    // Whether the element at the root is selected or not
    selected: false,
    baseWidth: 10,
    expandBtnText: 'v',
    // Polymer elements are shown differently and can be selected
    isPolymer: false,
    ready: function () {
      this.childElements = [];
      this.$.childrenContent.style.marginLeft = this.indent + this.baseWidth + 'px';
    },
    addChild: function (element) {
      this.childElements.push(element);
      this.$.childrenContent.appendChild(element);
    },
    /**
    * Empties the element-tree
    */
    empty: function () {
      this.text = '';
      for (var i = 0; i < this.childElements.length; i++) {
        this.childElements[i].empty();
        this.$.childrenContent.innerHTML = '';
      }
      delete this.childElements;
      this.childElements = [];
    },
    /**
    * Pre-populates the element-tree with a given tree
    * @root: not passed in first call, but passed internally to
    * pass around the root of the entire tree.
    */
    initFromDOMTree: function (tree, root) {
      this.empty();
      this.text = tree.tagName;
      this.isPolymer = tree.isPolymer;
      this.key = tree.key;
      if (this.isPolymer) {
        this.$.name.style.backgroundColor = COLOR_POLYMER_UNSELECTED;
      }
      this.root = root || this;
      for (var i = 0; i < tree.children.length; i++) {
        // Create a new ElementTree to hold a child
        var child = new ElementTree();
        child.indent = this.indent + this.baseWidth;
        child.initFromDOMTree(tree.children[i], this.root);
        this.addChild(child);
      }
    },
    /**
    * Collapse/Uncollapse
    */
    toggle: function () {
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
    },
    /**
    * Element selection/unselection
    */
    toggleSelection: function () {
      if (!this.isPolymer) {
        return;
      }
      if (this.selected) {
        // selectedChild holds the element in the tree that is currently selected
        this.root.selectedChild = null;
        setColor(this, COLOR_POLYMER_UNSELECTED);
        this.selected = !(this.selected);
        this.fire('unselected', {
          key: this.key
        });
      } else {
        var oldKey = null;
        if (this.root.selectedChild) {
          oldKey = this.root.selectedChild.key;
          // First unselect the currently selected child
          this.root.selectedChild.selected = false;
          setColor(this.root.selectedChild, COLOR_POLYMER_UNSELECTED);
        }
        this.root.selectedChild = this;
        setColor(this, COLOR_POLYMER_SELECTED);
        this.selected = !(this.selected);
        this.fire('selected', {
          key: this.key,
          oldKey: oldKey
        });
      }
    }
  });
})();
