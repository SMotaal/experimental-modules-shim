if (typeof importScripts === 'undefined') {
  let importScript;
  const global = (1, eval)('this');
  const cache = {};
  const resolved = Promise.resolve();
  if (global.document && global.document.defaultView === global) {
    const {baseURI, currentScript} = global.document || {};
    const parentElement = currentScript.parentElement;
    importScript = specifier => {
      let promise = cache[specifier];
      if (promise) return promise;
      try {
        return (cache[specifier] =
          (document.querySelector(
            // `script[src^="${specifier}"]:matches([type="text/javascript"],:not([type]))`,
            `script[src^="${specifier}"]:not([type]),script[src^="${specifier}"][type="text/javascript"]`,
          ) &&
            resolved) ||
          new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = specifier;
            script.onload = () => resolve(script);
            script.onerror = event => reject(event);
            parentElement.append(script);
          }));
      } catch (exception) {
        return (cache[specifier] = Promise.reject(exception));
      }
    };
  } else if (typeof global === 'object' && typeof require === 'function' && require.resolve) {
    const {readFileSync} = require('fs');
    const cache = {};
    const resolved = Promise.resolve();
    importScript = specifier => {
      let promise = cache[specifier];
      if (promise) return promise;
      try {
        const filename = require.resolve(specifier.replace(/^\.\//, '../'));
        (1, eval)(`${readFileSync(filename)}`);
        return (cache[specifier] = resolved);
      } catch (exception) {
        return (cache[specifier] = Promise.reject(exception));
      }
    };
  }

  global.importScripts = importScript
    ? (...specifiers) => {
        const promises = [];
        for (const specifier of specifiers)
          promises.push(cache[specifier] || importScript(specifier));
        return Promise.all(promises);
      }
    : () => TypeError('Unsupported enviroment!');

}

// const importScripts = (...specifiers) => {
//   const promises = [];
//   for (const src of specifiers) {
//     // const src = new URL(specifier, baseURI).href;
//     document.querySelector(
//       `script[src^="${src}"]:matches([type="text/javascript"],:not([type]))`,
//     ) || promises.push(importScript(src));
//     // scripts.push(Object.assign(document.createElement('script'), {src}));
//   }
//   return Promise.all(promises);
//   // currentScript.parentElement.append(...scripts);
//   // return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
// };
// global.importScripts = importScripts;

// const importModule = (importModule => {
//   maybe(() => eval('importModule = specifier => import(specifier)'));
//   importModule ||
//     (typeof require === 'function' && (importModule = async specifier => require(specifier)));
//   return importModule;
// });

// if (importModule) {
//   const {readFileSync} = import(module)
//   const scripts = [];
//   importScript =
// }
