(function () {
  function recurseDOM(node) {
    var markUp = '<li><p>' + node.tagName + '</p>';
    var innerMarkUp = '';
    for (var i = 0; i < node.childNodes.length; i++) {
      innerMarkUp += recurseDOM(node.childNodes[i]);
    }
    if (innerMarkUp.length > 0) {
      markUp += '<ul>' + innerMarkUp + '</ul>';
    }
    markUp += '</li>';
    return markUp;
  }
  var markUp = recurseDOM(document.body);
  chrome.runtime.sendMessage(markUp);
})();
