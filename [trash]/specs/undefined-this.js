setTimeout(async () => {
  await importScripts(
    './runtime/globals.js',
    './runtime/scope-handler.js',
    './runtime/global-context.js',
    './runtime/browser-context.js',
  );

  const global = this;

  const globals = 'Array ArrayBuffer Atomics Boolean DataView Date Error EvalError Float32Array Float64Array Int8Array Int16Array Int32Array isFinite isNaN JSON Map Math Number Object Promise Proxy RangeError ReferenceError Reflect RegExp Set SharedArrayBuffer String Symbol SyntaxError TypeError Uint8Array Uint8ClampedArray Uint16Array Uint32Array URIError WeakMap WeakSet parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape eval'.split(
    ' ',
  );

  const create = (
    test,
    context = new BrowserContext(),
    run = async function() {
      const scope = {context, this: this, test}; // 'new.target': new.target, arguments: arguments

      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        // scope.scope = this.scope;
        // scope.scope = Object.assign({}, this.scope);
        scope.scope = {};
        for (const k of globals) {
          try {
            scope.scope[k] = this[k];
          } catch (exception) {
            scope.scope[k] = exception;
          }
        }
      } catch (exception) {
        scope.scope = exception;
      }
      return scope;
    }.bind(context.context.self),
  ) => ({context, run, test});

  const tests = [
    ({context, run}) => run(),
    ({context, run}) => run(context.destroy()),
    ({context, run}) => run(context.dispose()),
  ];

  const results = []; //tests.map(test => test());

  for (const test of tests) {
    results.push(await test(create(test)));
  }

  results.map(result => console.dir(result));

  // console.log(results);
}, 100);
