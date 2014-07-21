(function () {
  Polymer('method-list', {
    filterSelected: function (items) {
      var selected = [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].setBreakpoint) {
          selected.push(i);
        }
      }
      return selected;
    },
    ready: function () {
      this.list = [];
      this.addEventListener('core-select', function (event) {
        event.stopPropagation();
        this.fire('breakpoint-toggle', {
          isSet: event.detail.isSelected,
          index: event.detail.item.id.substring(6)
        });
      });
    }
  });
})();
