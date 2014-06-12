(function () {
  var COLOR_POLYMER_SELECTED = '#8B7355';
  var COLOR_POLYMER_UNSELECTED = '#FCF6CF';
  function newExpandBtnState(present) {
    return present === '+' ? '-' : '+';
  }
  Polymer('element-tree', {
    indent: 0,
    collapsed: false,
    selected: false,
    baseWidth: 10,
    expandBtnText: '-',
    isPolymer: false,
    ready: function () {
      this.childElements = [];
      this.$.childrenContent.style.marginLeft = this.indent + this.baseWidth + 'px';
    },
    addChild: function (element) {
      this.childElements.push(element);
      this.$.childrenContent.appendChild(element);
    },
    empty: function () {
      this.text = '';
      for (var i = 0; i < this.childElements.length; i++) {
        this.childElements[i].empty();
        this.$.childrenContent.innerHTML = '';
      }
      delete this.childElements;
      this.childElements = [];
    },
    initFromDOMTree: function (tree, root) {
      this.empty();
      this.text = tree.JSONobj.value.tagName.value;
      this.isPolymer = tree.isPolymer;
      this.key = tree.key;
      if (this.isPolymer) {
        this.$.name.style.backgroundColor = COLOR_POLYMER_UNSELECTED;
      }
      this.root = root || this;
      for (var i = 0; i < tree.children.length; i++) {
        var child = new ElementTree();
        child.indent = this.indent + this.baseWidth;
        child.initFromDOMTree(tree.children[i], this.root);
        this.addChild(child);
      }
    },
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
    toggleSelection: function () {
      if (!this.isPolymer) {
        return;
      }
      if (this.selected) {
        this.root.selectedChild = null;
        this.$.name.style.backgroundColor = COLOR_POLYMER_UNSELECTED;
        this.selected = !(this.selected);
        this.fire('unselected', {
          key: this.key
        });
      } else {
        if (this.root.selectedChild) {
          this.root.selectedChild.toggleSelection();
        }
        this.root.selectedChild = this;
        this.$.name.style.backgroundColor = COLOR_POLYMER_SELECTED;
        this.selected = !(this.selected);
        this.fire('selected', {
          key: this.key
        });
      }
    }
  });
})();
