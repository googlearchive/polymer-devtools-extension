(function () {
  Polymer('method-list', {
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
