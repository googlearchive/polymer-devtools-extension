/**
* A helper object to help `eval` code in host page
*/
function createEvalHelper (callback) {
  var NAMESPACE = 'window._polymerNamespace_.';
  /**
  * Convert any object to a string
  */
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
        return '"' + object + '"';
      case 'object':
        return JSON.stringify(object);
      case 'array':
        return serializeArray(object);
      default:
        return object.toString();
    }
  }
  var helper = {
    /**
    * Define a function
    */
    defineFunction: function (name, string, callback) {
      chrome.devtools.inspectedWindow.eval(NAMESPACE + name + ' = ' + string, function (result, error) {
        callback && callback(result, error);
      });
    },
    /**
    * Define functions in a batch
    */
    defineFunctions: function (functionObjects, callback) {
      var toEval = '';
      for (var i = 0; i < functionObjects.length; i++) {
        toEval += NAMESPACE + functionObjects[i].name + ' = ' + functionObjects[i].string + ';';
      }
      chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
        callback && callback(result, error);
      });
    },
    /**
    * Execute a function and assign the result to lhs (in host page)
    */
    executeFunction: function (name, args, callback, lhs) {
      var params = '(';
      for (var i = 0; i < args.length - 1; i++) {
        params += serialize(args[i]) + ', ';
      }
      if (args.length > 0) {
        params += serialize(args[i]);
      }
      params += ')';
      var toEval = (lhs ? (NAMESPACE + lhs  + ' = ') : '') + NAMESPACE + name + params + ';'
      chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
        callback && callback(result, error);
      });
    }
  };

  // Wait till the namespace is created.
  chrome.devtools.inspectedWindow.eval('window._polymerNamespace_ = {};window._polymerNamespace_.observerCache = {};',
    function (result, error) {
      callback(helper);
    }
  );
}
