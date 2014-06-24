var EvalHelper;
(function () {
  var NAMESPACE = 'window._polymerNamespace_.';
  function serialize (object) {
      function serializeArray (arr) {
        var path = '[';
        var lastIndex = arr.length - 1;
        for (var i = 0; i <= lastIndex; i++) {
          path += ('"' + arr[i] + '"');
          if (i !== lastIndex) {
            path += ', ';
          }
        }
        path += ']';
        return path;
      }
    switch (typeof object) {
      case 'number':
        return object;
      case 'string':
        return '"' + string + '"';
      case 'object':
        return JSON.stringify(object);
      case 'array':
        return serializeArray(object);
      default:
        return object.toString();
    }
  }
  var helper = {
    defineFunction: function (name, string, callback) {
      chrome.devtools.eval(NAMESPACE + name + ' = ' + string, function (result, error) {
        callback(result, error);
      });
    },
    defineFunctions: function (functionObjects, callback) {
      var toEval = '';
      for (var i = 0; i < functionObjects.length; i++) {
        toEval += NAMESPACE + functionObjects[i].name + ' = ' + functionObjects[i].string;
      }
      chrome.devtools.eval(toEval, function (result, error) {
        callback(result, error);
      })
    },
    executeFunction: function (name, args, callback, lhs) {
      var params = '(';
      for (var i = 0; i < args.length - 2; i++) {
        params += ', ' + serialize(args[i]);
      }
      params += args[i] + ')';
      chrome.devtools.eval((lhs ? (NAMESPACE + lhs  + ' = ') : '') +
        NAMESPACE + name + params + ';', function (result, error) {
        callback(result, error);
      });
    }
  };

  chrome.devtools.eval(NAMESPACE + '_polymerNamespace_ = {};window._polymerNamespace_.observerCache = {};',
    function (result, error) {
      EvalHelper = helper;
      window.dispatchEvent(new CustomEvent('eval-helper-ready'));
    }
  );
})();
