/**
* A helper object to help `eval` code in host page
*/
function createEvalHelper (callback) {
  // The extension's ID serves as the namespace.
  var extensionNamespace = chrome.runtime.id;
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
  /**
   * Wraps a function into a self executing function that gets called with the
   * unique namespace (extension ID) so that the function to be defined in the
   * host page gets to know of the namespace.
   * @param  {string} fnName   name of the function
   * @param  {string} fnString body of the function
   * @return {string}          the wrapped function string
   */
  function wrapFunction (fnName, fnString) {
    return '(function (NAMESPACE) {' +
      'window["' + extensionNamespace + '"].' + fnName + ' = ' +
        fnString + ';' +
    '})("' + extensionNamespace + '");';
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
      var toEval = (lhs ? ('window["' + extensionNamespace + '"].' + lhs  + ' = ') : '') +
        'window["' + extensionNamespace + '"].' + name + params + ';';
      toEval += getSrcURL();
      chrome.devtools.inspectedWindow.eval(toEval, function (result, error) {
        callback && callback(result, error);
      });
    }
  };

  function cleanUp () {
    window.removeEventListener('clean-up', window[NAMESPACE].cleanUp);
    var keys;
    var i, j, methodNames;
    // Remove all object observers that were registered
    keys = Object.keys(window[NAMESPACE].observerCache);
    for (i = 0; i < keys.length; i++) {
      window[NAMESPACE].removeObjectObserver(keys[i], [], false);
    }
    // Remove all model object observers that were registered
    keys = Object.keys(window[NAMESPACE].modelObserverCache);
    for (i = 0; i < keys.length; i++) {
      window[NAMESPACE].removeObjectObserver(keys[i], [], true);
    }
    // Remove any breakpoints that were set
    keys = Object.keys(window[NAMESPACE].breakPointIndices);
    for (i = 0; i < keys.length; i++) {
      methodNames = Object.keys(window[NAMESPACE].breakPointIndices[keys[i]]);
      for (j = 0; j < methodNames.length; j++) {
        if (methodNames[i] in window[NAMESPACE].DOMCache[keys[i]]) {
          undebug(window[NAMESPACE].DOMCache[keys[i]][methodNames[i]]);
        }
      }
    }
    keys = Object.keys(window[NAMESPACE].DOMCache);
    for (i = 0; i < keys.length; i++) {
      // Remove DOM mutation observers
      if (keys[i] in window[NAMESPACE].mutationObserverCache) {
        window[NAMESPACE].mutationObserverCache[keys[i]].disconnect();
      }
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
  chrome.devtools.inspectedWindow.eval('window["' + extensionNamespace + '"] = {};',
    function (result, error) {
      // Define cleanUp
      helper.defineFunction('cleanUp', cleanUp.toString(), function (result, error) {
        if (error) {
          throw error;
        }
        // Add an event listener that removes itself
        chrome.devtools.inspectedWindow.eval('window.addEventListener("clean-up", ' +
          'window["' + extensionNamespace + '"].cleanUp);',
          function (result, error) {
            if (error) {
              throw error;
            }
            // We are ready to let helper be used
            callback(helper);
          }
        );
      });
    }
  );
}
