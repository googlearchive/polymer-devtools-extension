(function () {
  /**
  * Tells if the new value of the field is valid or not
  */
  var EXPAND_BTN_IMAGE = '../res/expand.png';
  var COLLAPSE_BTN_IMAGE = '../res/collapse.png';
  var BLANK_IMAGE = '../res/blank.png';
  function copyArray (arr) {
    var newArr = [];
    for (var i = 0; i < arr.length; i++) {
      newArr.push(arr[i]);
    }
    return newArr;
  }
  function isFieldValueValid (val) {
    var validValues = ['true', 'false', 'undefined', 'null'];
    if ((validValues.indexOf(val) !== -1) ||
      (val.length >= 2 &&
      (val[0] === '"' && val[val.length - 1] === '"') ||
      (val[0] === '\'' && val[val.length - 1] === '\'')) ||
      !isNaN(parseInt(val, 10))) {
      return true;
    }
    return false;
  }
  Polymer('object-tree', {
    indent: 0,
    collapsed: true,
    baseWidth: 14,
    expandBtnImg: EXPAND_BTN_IMAGE,
    ready: function () {
      this.tree = [];
      this.path = [];
      this.addEventListener('field-changed', function (event) {
        var newValue = event.detail.newValue;
        var oldValue = event.detail.oldValue;
        var index = event.detail.field.id.substring(5);
        var path = copyArray(this.path);
        path.push(index);
        // Stop propagation since this will fire another event
        event.stopPropagation();
        if (!isFieldValueValid(newValue)) {
          event.detail.field.text = oldValue;
          return;
        }
        // Fire an event with all the information
        this.fire('property-changed', {
          path: path,
          value: newValue
        });
      });
      this.addEventListener('child-added', function (event) {
        var child = event.detail.child;
        if (child === this) {
          return;
        }
        var index = event.detail.index;
        if (this.tree[index].value.length - 1 < index) {
          child.tree = this.tree[index].value;
          var pathCopy = copyArray(this.path);
          pathCopy.push(index);
          child.path = pathCopy;
        }
        event.stopPropagation();
      });
      this.addEventListener('child-collapsed', function (event) {
        var index = event.detail.index;
        this.tree[index].value.length = 0;
        event.stopPropagation();
      });
    },
    domReady: function () {
      var that = this;
      this.fire('child-added', {
        child: that,
        index: that.id.substring(5)
      });
    },
    /**
    * Collapse/Uncollapse
    */
    toggle: function (event) {
      var targetId = event.target.id;
      var state = event.target.getAttribute('state');
      if (state === 'expanded') {
        this.fire('child-collapsed', {
          index: targetId.substring(3)
        });
      }
      var path = copyArray(this.path);
      path.push(targetId.substring(3));
      var eventName = (state === 'collapsed') ? 'object-expand' : 'object-collapse';
      this.fire(eventName, {
        path: path
      });
    }
  });
})();
