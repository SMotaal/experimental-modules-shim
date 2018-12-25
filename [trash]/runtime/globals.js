class Globals {
  constructor(globals, context, ...bindings) {
    globals = Object.assign(this, globals);
    context === undefined && (context = Globals.context || (Globals.context = (1, eval)('this')));

    // bindings.length ||
    //   (bindings =
    //     Globals.identifiers ||
    //     (Globals.identifiers = 'Array ArrayBuffer Atomics Boolean DataView Date Error EvalError Float32Array Float64Array Int8Array Int16Array Int32Array isFinite isNaN JSON Map Math Number Object Promise Proxy RangeError ReferenceError Reflect RegExp Set SharedArrayBuffer String Symbol SyntaxError TypeError Uint8Array Uint8ClampedArray Uint16Array Uint32Array URIError WeakMap WeakSet parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape eval'.split(
    //       ' ',
    //     )));

    if (bindings.length > 1 || bindings[0]) {
      const descriptors = {};
      for (const binding of bindings) {
        binding in globals ||
          (descriptors[binding] = {get: () => (context && context[binding]) || undefined});
      }
      Object.defineProperties(globals, descriptors);
    }

    return Object.setPrototypeOf(newContext => (context = newContext || undefined), globals);
  }
}

Object.setPrototypeOf(Globals.prototype, null);

// function Globals() {
//   if (!new.target) return new Globals(...arguments);

//   globals = Object.assign(this, globals);
//   context === undefined && (context = (1, eval)('this'));

//   bindings.length ||
//     (bindings =
//       Globals.identifiers ||
//       (Globals.identifiers = 'Array ArrayBuffer Atomics Boolean DataView Date Error EvalError Float32Array Float64Array Int8Array Int16Array Int32Array isFinite isNaN JSON Map Math Number Object Promise Proxy RangeError ReferenceError Reflect RegExp Set SharedArrayBuffer String Symbol SyntaxError TypeError Uint8Array Uint8ClampedArray Uint16Array Uint32Array URIError WeakMap WeakSet parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape eval'.split(
//         ' ',
//       )));

//   if (bindings.length > 1 || bindings[0]) {
//     const descriptors = {};
//     for (const identifier in bindings)
//       identifier in globals ||
//         (descriptors[identifier] = {get: () => (context && context[identifier]) || undefined});
//     Object.defineProperties(globals, descriptors);
//   }

//   return Object.setPrototypeOf(newContext => (context = newContext || undefined), globals);
// }
