Polymer('persistent-button', {
  selected: false,
  toggle: function () {
    this.selected = !this.selected;
    if (this.selected) {
      this.$.btn.active = true;
      this.fire('button-active');
    } else {
      this.$.btn.active = false;
      this.fire('button-inactive');
    }
  }
});
