(function () {
  function newExpandBtnState(present) {
    return present === '+' ? '-' : '+';
  }
  Polymer('object-tree', {
    indent: 0,
    collapsed: false,
    baseWidth: 10,
    expandBtnText: '-',
    contentText: '',
    labelText: '',
    valueNeeded: false,
    ready: function () {
      this.childElements = [];
      this.$.childrenContent.style.marginLeft = this.indent + this.baseWidth + 'px';
    },
    addChild: function (element) {
      this.childElements.push(element);
      this.$.childrenContent.appendChild(element);
    },
    empty: function () {
      this.labelText = '';
      this.valueNeeded = false;
      for (var i = 0; i < this.childElements.length; i++) {
        this.childElements[i].empty();
        this.$.childrenContent.innerHTML = '';
      }
      delete this.childElements;
      this.childElements = [];
    },
    initFromObjectTree: function (tree) {
      this.empty();
      this.labelText = tree.name;
      if (tree.type === 'object') {
        for (key in tree.value) {
          if (tree.value.hasOwnProperty(key)) {
            var childTree = new ObjectTree();
            childTree.initFromObjectTree(tree.value[key]);
            this.addChild(childTree);
          }
        }
      } else {
        this.valueNeeded = true;
        this.contentText = tree.value;
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
    }
  });
})();
