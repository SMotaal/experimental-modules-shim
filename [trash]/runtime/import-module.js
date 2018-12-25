if (typeof importModule === 'undefined') {
  const global = (1, eval)('this');
  // const cache = {};
  // const resolved = Promise.resolve();
  const baseURI = (global.document && global.document.baseURI) || '';
  const importModule = (specifier, referrer = baseURI) => {
    const url = referrer ? (new URL(specifier, referrer)).href : specifier;
    return (importModule.import ||
      (importModule.import = (1, eval)('specifier => import(specifier)')))(url);
  };

  global.importModule = importModule;

  // if (global.document && global.document.defaultView === global) {
  //   const {baseURI, currentScript} = global.document || {};
  //   const parentElement = currentScript.parentElement;
  //   importScript = specifier => {
  //     let promise = cache[specifier];
  //     if (promise) return promise;
  //     try {
  //       return (cache[specifier] =
  //         (document.querySelector(
  //           // `script[src^="${specifier}"]:matches([type="text/javascript"],:not([type]))`,
  //           `script[src^="${specifier}"]:not([type]),script[src^="${specifier}"][type="text/javascript"]`,
  //         ) &&
  //           resolved) ||
  //         new Promise((resolve, reject) => {
  //           const script = document.createElement('script');
  //           script.src = specifier;
  //           script.onload = () => resolve(script);
  //           script.onerror = event => reject(event);
  //           parentElement.append(script);
  //         }));
  //     } catch (exception) {
  //       return (cache[specifier] = Promise.reject(exception));
  //     }
  //   };
  // } else if (typeof global === 'object' && typeof require === 'function' && require.resolve) {
  //   const {readFileSync} = require('fs');
  //   const cache = {};
  //   const resolved = Promise.resolve();
  //   importScript = specifier => {
  //     let promise = cache[specifier];
  //     if (promise) return promise;
  //     try {
  //       const filename = require.resolve(specifier.replace(/^\.\//, '../'));
  //       (1, eval)(`${readFileSync(filename)}`);
  //       return (cache[specifier] = resolved);
  //     } catch (exception) {
  //       return (cache[specifier] = Promise.reject(exception));
  //     }
  //   };
  // }

  // global.importModule = importScript
  //   ? (...specifiers) => {
  //       const promises = [];
  //       for (const specifier of specifiers)
  //         promises.push(cache[specifier] || importScript(specifier));
  //       return Promise.all(promises);
  //     }
  //   : () => TypeError('Unsupported enviroment!');
}
