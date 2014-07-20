/**
* A helper object to help `eval` code in host page
*/
function createEvalHelper (callback) {
  // The extension's ID serves as the namespace.
  var NAMESPACE = chrome.runtime.id;
  /**
  * Convert any object to a string
  */
  function serialize (object) {
    return JSON.stringify(object);
  }
  var srcURLID = 0;
  function getSrcURL (string) {
    srcURLID++;
    return '\n//@ sourceURL=src' + srcURLID + '.js';
  }
  function wrapFunction (fnName, fnString) {
    return '(function (NAMESPACE) {' +
      'window["' + NAMESPACE + '"].' + fnName + ' = ' +
        fnString + ';' +
    '})("' + NAMESPACE + '");';
  }
  var helper = {
    /**
    * Define a function
    */
    defineFunction: function (name, string, callback) {
      chrome.devtools.inspectedWindow.eval(wrapFunction(name, string) + getSrcURL(),
        function (result, error) {
          callback && callback(result, error);
        });
    },
    /**
    * Define functions in a batch
    */
    defineFunctions: function (functionObjects, callback) {
      var toEval = '';
      for (var i = 0; i < functionObjects.length; i++) {
        toEval += wrapFunction(functionObjects[i].name, functionObjects[i].string) + ';\n\n';
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
      var toEval = (lhs ? ('window["' + NAMESPACE + '"].' + lhs  + ' = ') : '') +
        'window["' + NAMESPACE + '"].' + name + params + ';';
      toEval += getSrcURL();
      chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
        callback && callback(result, error);
      });
    }
  };

  function cleanUp () {
    window.removeEventListener('clean-up', window[NAMESPACE].cleanUp);
    var keys = Object.keys(window[NAMESPACE].DOMCache);
    for (var i = 0; i < keys.length; i++) {
      // Remove the key property that we had added to all DOM objects
      delete window[NAMESPACE].DOMCache[keys[i]].__keyPolymer__;
    }
    // Unhighlight any selected element
    if (window[NAMESPACE].lastSelectedKey) {
      window[NAMESPACE].unhighlight(window[NAMESPACE].lastSelectedKey, false);
    }
    // TODO: Unhighlight hovered elements too
    delete window[NAMESPACE];
  }
  // Wait till the namespace is created and clean-up handler is created.
  chrome.devtools.inspectedWindow.eval('window["' + NAMESPACE + '"] = {};',
    function (result, error) {
      // Define cleanUp
      helper.defineFunction('cleanUp', cleanUp.toString(), function (result, error) {
        // Add an event listener that removes itself
        chrome.devtools.inspectedWindow.eval('window.addEventListener("clean-up", ' +
          'window["' + NAMESPACE + '"].cleanUp);',
          function (result, error) {
            // We are ready to let helper be used
            callback(helper);
          }
        );
      });
    }
  );
}
