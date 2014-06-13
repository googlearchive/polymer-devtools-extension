(function () {
  Polymer('editable-label', {
    text: '',
    editing: false,
    width: 5,
    lastText: '',
    hidden: false,
    toggleEditing: function () {
      if (this.editing) {
        this.$.dynamic.style.display = 'none';
        this.$.static.style.display = 'block';
      } else {
        this.$.dynamic.style.display = 'block';
        this.$.static.style.display = 'none';
      }
      this.editing = !this.editing;
    },
    ready: function () {
      this.$.dynamic.style.display = 'none';
    },
    startEditing: function () {
      if (!this.editing) {
        this.toggleEditing();
        this.$.dynamic.select();
      }
    },
    stopEditing: function () {
      if (this.editing) {
        this.toggleEditing();
      }
    },
    handleKeyPress: function (event) {
      if (event.keyCode === 13) {
        this.stopEditing();
        this.fire('field-changed', {
          oldValue: this.lastText,
          newValue: this.text
        });
        this.lastText = this.text;
      }
    }
  });
})();
