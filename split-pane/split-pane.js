(function () {
  Polymer('split-pane', {
    resizePanels: function (event) {
      var newX = event.offsetX + this.$.left.offsetWidth;
      var totalWidth = this.$.content.offsetWidth;
      this.$.left.style.width = (newX / totalWidth * 100) + '%';
    }
  });
})();
