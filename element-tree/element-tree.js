(function () {
  Polymer('element-tree', {
    indent: 0,
    collapsed: false,
    baseWidth: 10,
    ready: function () {
      this.childElements = [];
      this.$.childrenContent.style.marginLeft = this.indent + this.baseWidth + 'px';
    },
    addChild: function (element) {
      this.childElements.push(element);
    },
    empty: function () {
      this.text = '';
      for (var i = 0; i < this.childElements.length; i++) {
        this.childElements[i].empty();
      }
      delete this.childElements;
      this.childElements = [];
    },
    initFromDOMTree: function (tree) {
      this.empty();
      this.text = tree.tagName;
      for (var i = 0; i < tree.children.length; i++) {
        var child = new ElementTree();
        child.indent = this.indent + this.baseWidth;
        child.initFromDOMTree(tree.children[i]);
        this.childElements.push(child);
        this.$.childrenContent.appendChild(child);
      }
    },
    toggle: function () {
      this.collapsed = !this.collapsed;
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
