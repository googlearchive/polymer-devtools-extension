Polymer('core-pages', {
  selected: 0,
  ready: function () {
    if (this.children[this.selected]) {
      this.children[this.selected].classList.add('core-pages-selected');
    }
  },
  selectedChanged: function (oldVal, newVal) {
    if (this.children[this.selected]) {
      this.children[oldVal].classList.remove('core-pages-selected');
      this.children[this.selected].classList.add('core-pages-selected');
    } else {
      this.selected = oldVal;
    }
  }
});
