(function () {
  Polymer('editable-label', {
    text: '',
    // Present state: editing or not
    editing: false,
    width: 5,
    lastText: null,
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
        // Select all text in the dynamic field
        this.$.dynamic.select();
      }
    },
    stopEditing: function () {
      if (this.editing) {
        this.toggleEditing();
        if (this.lastText === this.text) {
          return;
        }
        var that = this;
        this.fire('field-changed', {
          oldValue: that.lastText,
          newValue: that.text,
          field: that,
          name: that.getAttribute('data-name')
        });
        this.lastText = this.text;
      }
    },
    /**
    * Handle `enter` key
    */
    handleKeyPress: function (event) {
      if (event.keyCode === 13) {
        // Enter was pressed. It marks the end of editing.
        this.stopEditing();
      }
    },
    textChanged: function (oldVal, newVal) {
      if (this.lastText === null) {
        this.lastText = newVal;
      }
    }
  });
})();
