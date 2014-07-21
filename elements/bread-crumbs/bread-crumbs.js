Polymer('bread-crumbs', {
  clicked: function (event) {
    var index = parseInt(event.target.id.substring(3));
    var key = this.list[index].key;
    this.list.splice(index + 1);
    this.fire('bread-crumb-click', {
      key: key
    });
  }
});
