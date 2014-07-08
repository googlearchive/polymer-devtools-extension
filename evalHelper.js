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
    if (object === null) {
      return 'null';
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
      case 'undefined':
        return 'undefined';
      default:
        return object.toString();
    }
  }
  var srcURLID = 0;
  function getSrcURL (string) {
    srcURLID++;
    return '\n//@ sourceURL=src' + srcURLID + '.js';
  }
  var helper = {
    /**
    * Define a function
    */
    defineFunction: function (name, string, callback) {
      chrome.devtools.inspectedWindow.eval(NAMESPACE + name + ' = ' + string + getSrcURL(), function (result, error) {
        callback && callback(result, error);
      });
    },
    /**
    * Define functions in a batch
    */
    defineFunctions: function (functionObjects, callback) {
      var toEval = '';
      for (var i = 0; i < functionObjects.length; i++) {
        toEval += NAMESPACE + functionObjects[i].name + ' = ' + functionObjects[i].string + ';\n\n';
      }
      toEval += getSrcURL();
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
      toEval += getSrcURL();
      chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
        callback && callback(result, error);
      });
    }
  };

  function cleanUp () {
    window.removeEventListener('clean-up', window._polymerNamespace_.cleanUp);
    var keys = Object.keys(window._polymerNamespace_.DOMCache);
    for (var i = 0; i < keys.length; i++) {
      // Remove the key property that we had added to all DOM objects
      delete window._polymerNamespace_.DOMCache[keys[i]].__keyPolymer__;
    }
    // Unhighlight any selected element
    if (window._polymerNamespace_.lastSelectedKey) {
      window._polymerNamespace_.unhighlight(window._polymerNamespace_.lastSelectedKey, false);
    }
    // TODO: Unhighlight hovered elements too
    delete window._polymerNamespace_;
  }
  // Wait till the namespace is created and clean-up handler is created.
  chrome.devtools.inspectedWindow.eval('window._polymerNamespace_ = {};',
    function (result, error) {
      // Define cleanUp
      helper.defineFunction('cleanUp', cleanUp.toString(), function (result, error) {
        // Add an event listener that removes itself
        chrome.devtools.inspectedWindow.eval('window.addEventListener("clean-up", window._polymerNamespace_.cleanUp);',
          function (result, error) {
            // We are ready to let helper be used
            callback(helper);
          }
        );
      });
    }
  );
}
