/*(function () {
  function getPolymerMarkup(node) {
    function checkPolymerElement(node) {
      return node && ('element' in node) && (node.element.localName === 'polymer-element');
    }
    function recurseDOM(node) {
      var markUp = '';
      var isPolymerElement = checkPolymerElement(node);
      if (isPolymerElement) {
        markUp = '<li><p>' + node.tagName + '</p></li>';
        node = node.shadowRoot;
      }
      if (isPolymerElement && node.children.length > 0) {
        markUp += '<ul>';
      }
      for (var i = 0; i < node.children.length; i++) {
        var childMarkUp = recurseDOM(node.children[i]);
        if (childMarkUp.length > 0) {
          markUp += childMarkUp;
        }
      }
      if (isPolymerElement && node.children.length > 0) {
        markUp += '</ul>';
      }
      return markUp;
    }
    return '<ul>' + recurseDOM(node) + '</ul>';
  }
  window.addEventListener('polymer-ready', function () {
    window.setTimeout(function () {
      document.body.children[0].foo = 5;
      var markUp = getPolymerMarkup(document.body);
      chrome.runtime.sendMessage({
        name: 'mark-up',
        content: markUp
      });
    }, 2000);
  });
})();
*/
window.addEventListener('polymer-ready', function () {
  chrome.runtime.sendMessage({
    name: 'refresh'
  });
});
