{
  /// ESX Modules Experiment

  // console.clear();

  const enumerable = true;

  const define = (target, property, value) =>
    Reflect.defineProperty(target, property, {value, enumerable}) && value;
  const bind = (target, property, get) =>
    Reflect.defineProperty(target, property, {get, configurable: true, enumerable});

  function ModuleNamespace() {
    Object.defineProperty(this, Symbol.toStringTag, {
      value: 'ModuleNamespace',
      enumerable: false,
    });
  }
  ModuleNamespace.prototype = null;

  class Module {
    constructor(url, evaluator) {
      define(this, 'url', url);
      define(this, 'evaluator', evaluator);
      const context = define(this, 'context', Object.create(null));
      const bindings = define(this, 'bindings', Object.create(null));

      Link: {
        Module.map[url] = this;
      }

      Instantiate: {
        const namespace = define(this, 'namespace', new ModuleNamespace());
        context.bindings = new Proxy(ModuleScope, {
          get: (target, property) => {
            if (typeof property !== 'string') return;
            if (property in bindings) return bindings[property];
            return Reflect.get(ModuleScope, property);
          },
        });
        context.exports = (...exports) => void Module.bind(namespace, ...exports);
        context.imports = () => {};
        context.exports.from = (...exports) => void null;
        context.exports.default = value => void Module.bind(namespace, {default: () => value});
      }

      this.evaluate();
    }

    async evaluate() {
      const context = Object.freeze(this.context);
      try {
        this.evaluator(context);
      } catch (exception) {
        define(this, 'exception', exception);
      }
    }

    static bind(namespace, ...bindings) {
      const descriptors = {};
      for (const binding of bindings) {
        const type = typeof binding;
        if (type === 'function') {
          const identifier = (Identifier.exec(binding) || '')[0];
          identifier && bind(namespace, identifier, binding);
        } else if (type === 'object') {
          for (const identifier in binding) {
            identifier && bind(namespace, identifier, binding[identifier]);
          }
        }
      }
    }
  }

  Module.map = {};

  const BindExpression = /^(?:\(?\)?|(\S+)) => (\S+)$/;
  const Identifier = /[^\n\s\(\)\{\}\-=+*/%`"~!&.:^<>]+/;

  const ModuleScope = (() => {
    const globalScope = (1, eval)('this');
    const globals = (({eval, Object}) => ({eval, Object, Module}))(globalScope);
    // const moduleScope = new Proxy(Object.freeze(Object.create(globalScope)), {
    const moduleScope = new Proxy(Object.freeze(Object.setPrototypeOf({...globals}, globalScope)), {
      get: (target, property) => {
        if (typeof property !== 'string') return;
        if (property in globals) return globals[property];
        const value = globalScope[property];
        return (value && typeof value === 'function' && value.bind(globalScope)) || value;
      },
      set: (target, property) => {
        throw ReferenceError(`${property} is not defined`);
      },
      // defineProperty: () => false,
      // has: (target, property) => Reflect.has(global, property),
      // has: (target, property) => false,
    });

    return moduleScope;
  })();

  {
    /// LEVEL 1 — Top-Level Exports
    //* SEE: https://jsbin.com/gist/c50a4dfb97f406278b4a1643b0947a48?source=javascript&result=console

    with (ModuleScope) {
      new Module('exporting-module', async module => {
        await module.imports();
        with (module.bindings) {
          /* ECMAScript Object Context */
          const defaults = Object.create(null);

          maybe(() => (Object = 1));

          /* Exported Top-level Variables */
          var q;
          await module.exports(() => q);

          const TWO = 2;
          await module.exports(() => TWO);

          let {y = {}} = defaults;
          await module.exports(() => y);

          await module.exports.default(defaults);

          /* Exported Top-level Functions and Classes */
          function g1() {} // hoists expected
          await module.exports(() => g1); // exports when expected

          async function g2() {} // hoists expected
          await module.exports(() => g2); // exports when expected

          async function* g3() {} // hoists expected
          await module.exports(() => g3); // exports when expected

          class G1 {} // does not hoist expected
          await module.exports(() => G1); // exports when expected
        }
      });
    }
  }
  {
    /// LEVEL 2 — Imports
    // const module = (modules['importing-module'] = new Module());
    // // module.imports('* as x from ${};');
    // with (module.context()) {
    // }
  }

  /// LOGGING
  with (ModuleScope) {
    for (const id in Module.map) {
      const module = Module.map[id];
      const context = module['[[ModuleContext]]'];
      const exports = {...module.exports};
      console.log({module, exports});
    }
  }

  function restack(exception, replacer, replacement = '$1') {
    return Object.defineProperty(exception, 'stack', {
      value: exception.stack.replace(replacer, replacement),
    });
  }

  function maybe(ƒ) {
    try {
      ƒ();
    } catch (exception) {
      console.error(restack(exception, /^(.*?\n)([^]*\bmaybe\b.*?\n)/));
    }
  }
}

// (target, property) => Reflect.has(globalScope, property)

// const global = (1, eval)('this');
// const globalScope = Object.freeze({... global});
// const globals = Object.freeze(({eval}) => ({eval, Module}))(global);
// // const globalScope = Object.setPrototypeOf((({eval}) => ({eval, Module}))(global), global);
// const moduleScope = new Proxy(globalScope, {
//   has: () => false,
//   get: (target, property) => {
//     if (typeof property !== 'string') return;
//     // if (property in globals) return globals[property];
//     const value = global[property];
//     return (value && typeof value === 'function' && value.bind(global)) || value;
//   },
//   set: (target, property) => {
//     throw ReferenceError(`Can't set ${property}`);
//   },
// });

// return Object.setPrototypeOf(globals, moduleScope);

/// IMPLEMENTATION
// function Module() {
//   Module = class Module {
//     context(...names) {
//       if (this.hasOwnProperty(MODULE_CONTEXT) && this(MODULE_CONTEXT))
//         throw Error(`${MODULE_CONTEXT} already created`);
//       return define(this, MODULE_CONTEXT, new ModuleContext(this, ...names), false, false, false)
//         .internal;
//     }
//     get exports() {
//       return this[MODULE_CONTEXT] && this[MODULE_CONTEXT].external;
//     }
//   };

//   class ModuleContext {
//     constructor(module, ...names) {
//       (names.length && Object.freeze(names)) || (names = empty);
//       define(this, 'names', names);
//       define(this, 'module', module);
//     }

//     get bindings() {
//       const names = this.names;
//       const bindings = (names && names.length && {}) || null;
//       define(bindings, 'const', new Set());
//       define(this, 'bindings', bindings);
//       return bindings;
//     }

//     get external() {
//       const names = this.names;
//       const external = new ModuleNamespace();
//       if (names && names.length) {
//         const bindings = this.bindings;
//         const properties = {};
//         const enumerable = true;
//         for (const name of names) properties[name] = {get: () => bindings[name], enumerable};
//         defineProperties(external, properties);
//       }
//       define(this, 'external', external);
//       return external;
//     }

//     get internal() {
//       const names = this.names;
//       const internal = Object.create(moduleScope); // {};
//       const properties = {};
//       const configurable = false;
//       const enumerable = true;
//       if (names && names.length) {
//         const bindings = this.bindings;
//         const Modes = ['var', 'let', 'const', 'default'];
//         const Accessor = new RegExp(raw`^\(\) => (${names.join('|')})|`, 'u');

//         for (const name of names) {
//           properties[name] = {
//             set: value => setBinding(bindings, name, value),
//             get: () => getBinding(bindings, name),
//             configurable,
//             enumerable,
//           };
//         }

//         const finalize = value =>
//           (bindings[BINDING_MODE] = void (
//             bindings[BINDING_MODE] === 'default' && (internal.default = value)
//           ));

//         const exports = (accessor, name) => {
//           const type = (accessor === null && 'null') || typeof accessor;
//           if (type === 'function' && (name = Accessor.exec(accessor)[1]))
//             return void (bindings[name] = accessor());
//           if (type === 'string' && Modes.includes(accessor))
//             return (bindings[BINDING_MODE] = accessor), finalize;
//           throw Error(`exports invoked with an invalid intent`);
//         };
//         properties.exports = {value: exports, writable: false, configurable: false};
//       } else {
//         properties.exports = {value: undefined, writable: false, configurable: false};
//       }
//       defineProperties(internal, properties);
//       define(this, 'internal', internal);
//       return internal;
//     }
//   }

//   const {defineProperty, defineProperties, setPrototypeOf} = Object;

//   const MODULE_CONTEXT = '[[ModuleContext]]';
//   const BINDING_MODE = '[[BindingMode]]';
//   const empty = Object.freeze([]);
//   const globals = {eval};
//   const globalScope = (1, eval)('this');
//   const moduleScope = new Proxy(Object.freeze(Object.create(globalScope)), {
//     has: () => false,
//     get: (target, property) => {
//       if (typeof property !== 'string') return;
//       if (property in globals) return globals[property];
//       const value = globalScope[property];
//       return (value && typeof value === 'function' && value.bind(globalScope)) || value;
//     },
//   });
//   const define = (
//     target,
//     property,
//     value,
//     writable = false,
//     configurable = false,
//     enumerable = true,
//   ) => defineProperty(target, property, {value, writable, configurable, enumerable})[property];
//   const raw = String.raw;

//   const setBinding = (bindings, name, value) => {
//     const mode = bindings[BINDING_MODE];
//     if (name in bindings) {
//       if (bindings.const.has(name))
//         throw ReferenceError(`Cannot assign to immutable variable '${name}'`);
//       else if (!mode) return void (bindings[name] = value);
//     } else {
//       if (mode === 'var' || mode === 'let') define(bindings, name, value, true);
//       else if (mode === 'const' || mode === 'default')
//         bindings.const.add(name), define(bindings, name, value);
//       else throw ReferenceError(`${name} is not defined`);
//     }
//   };

//   const getBinding = (bindings, name) => {
//     const mode = bindings[BINDING_MODE];
//     if ((!mode && name in bindings) || mode === 'var' || mode === 'let') return bindings[name];
//     throw ReferenceError(`${name} is not defined`);
//   };

//   class ModuleNamespace {}
//   define(ModuleNamespace.prototype, Symbol.toStringTag, 'ModuleNamespace');
//   setPrototypeOf(ModuleNamespace.prototype, null);

//   return new.target ? new Module(...arguments) : Module(...arguments);
// }
