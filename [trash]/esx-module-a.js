{
  /// ESX Modules Experiment

  console.clear();
  const modules = {};

  {
    /// LEVEL 1 — Top-Level Exports
    //* SEE: https://jsbin.com/gist/c50a4dfb97f406278b4a1643b0947a48?source=javascript&result=console
    modules['exporting-module'] = new Module();
    with (modules['exporting-module'].context('q', 'TWO', 'y', 'default', 'g1', 'g2', 'g3', 'G1')) {
      /* ECMAScript Object Context */
      const defaults = {};

      /* Exported Top-level Variables */
      exports(`var`)(q); //                     mutable exports when expected
      // OR: exports.var(q);
      exports(`const`)((TWO = 2)); //           immutable exports when expected
      // OR: exports.const((TWO = 2));
      exports(`let`)(({y = {}} = defaults)); // mutable exports when expected
      // OR: exports.let(({y = {}} = defaults));
      exports(`default`)(defaults); //          default exports when expected
      // OR: exports.default(defaults);

      /* Exported Top-level Functions and Classes */
      function g1() {} // hoists expected
      exports(() => g1); // exports when expected
      async function g2() {} // hoists expected
      exports(() => g2); // exports when expected
      async function* g3() {} // hoists expected
      exports(() => g3); // exports when expected
      class G1 {} // does not hoist expected
      exports(() => G1); // exports when expected

      maybe(() => (TWO = 1));

      //# sourceURL=exporting-module
    }
  }
  {
    /// LEVEL 2 — Imports
    const module = modules['importing-module'] = new Module();
    // module.imports('* as x from ${};');
    with (module.context()) {}
  }

  /// LOGGING
  {
    for (const id in modules) {
      const module = modules[id];
      const context = module['[[ModuleContext]]'];
      const exports = {...module.exports};
      console.log({module, exports});
    }
  }
  /// IMPLEMENTATION
  function Module() {
    Module = class Module {
      context(...names) {
        if (this.hasOwnProperty(MODULE_CONTEXT) && this(MODULE_CONTEXT))
          throw Error(`${MODULE_CONTEXT} already created`);
        return define(this, MODULE_CONTEXT, new ModuleContext(this, ...names), false, false, false)
          .internal;
      }
      get exports() {
        return this[MODULE_CONTEXT] && this[MODULE_CONTEXT].external;
      }
    };

    class ModuleContext {
      constructor(module, ...names) {
        (names.length && Object.freeze(names)) || (names = empty);
        define(this, 'names', names);
        define(this, 'module', module);
      }

      get bindings() {
        const names = this.names;
        const bindings = (names && names.length && {}) || null;
        define(bindings, 'const', new Set());
        define(this, 'bindings', bindings);
        return bindings;
      }

      get external() {
        const names = this.names;
        const external = new ModuleNamespace();
        if (names && names.length) {
          const bindings = this.bindings;
          const properties = {};
          const enumerable = true;
          for (const name of names) properties[name] = {get: () => bindings[name], enumerable};
          defineProperties(external, properties);
        }
        define(this, 'external', external);
        return external;
      }

      get internal() {
        const names = this.names;
        const internal = Object.create(moduleScope); // {};
        const properties = {};
        const configurable = false;
        const enumerable = true;
        if (names && names.length) {
          const bindings = this.bindings;
          const Modes = ['var', 'let', 'const', 'default'];
          const Accessor = new RegExp(raw`^\(\) => (${names.join('|')})|`, 'u');

          for (const name of names) {
            properties[name] = {
              set: value => setBinding(bindings, name, value),
              get: () => getBinding(bindings, name),
              configurable,
              enumerable,
            };
          }

          const finalize = value =>
            (bindings[BINDING_MODE] = void (
              bindings[BINDING_MODE] === 'default' && (internal.default = value)
            ));

          const exports = (accessor, name) => {
            const type = (accessor === null && 'null') || typeof accessor;
            if (type === 'function' && (name = Accessor.exec(accessor)[1]))
              return void (bindings[name] = accessor());
            if (type === 'string' && Modes.includes(accessor))
              return (bindings[BINDING_MODE] = accessor), finalize;
            throw Error(`exports invoked with an invalid intent`);
          };
          properties.exports = {value: exports, writable: false, configurable: false};
        } else {
          properties.exports = {value: undefined, writable: false, configurable: false};
        }
        defineProperties(internal, properties);
        define(this, 'internal', internal);
        return internal;
      }
    }

    const {defineProperty, defineProperties, setPrototypeOf} = Object;

    const MODULE_CONTEXT = '[[ModuleContext]]';
    const BINDING_MODE = '[[BindingMode]]';
    const empty = Object.freeze([]);
    const globals = {eval};
    const globalScope = (1, eval)('this');
    const moduleScope = new Proxy(Object.freeze(Object.create(globalScope)), {
      has: () => false,
      get: (target, property) => {
        if (typeof property !== 'string') return;
        if (property in globals) return globals[property];
        const value = globalScope[property];
        return (value && typeof value === 'function' && value.bind(globalScope)) || value;
      },
    });
    const define = (
      target,
      property,
      value,
      writable = false,
      configurable = false,
      enumerable = true,
    ) => defineProperty(target, property, {value, writable, configurable, enumerable})[property];
    const raw = String.raw;

    const setBinding = (bindings, name, value) => {
      const mode = bindings[BINDING_MODE];
      if (name in bindings) {
        if (bindings.const.has(name))
          throw ReferenceError(`Cannot assign to immutable variable '${name}'`);
        else if (!mode) return void (bindings[name] = value);
      } else {
        if (mode === 'var' || mode === 'let') define(bindings, name, value, true);
        else if (mode === 'const' || mode === 'default')
          bindings.const.add(name), define(bindings, name, value);
        else throw ReferenceError(`${name} is not defined`);
      }
    };

    const getBinding = (bindings, name) => {
      const mode = bindings[BINDING_MODE];
      if ((!mode && name in bindings) || mode === 'var' || mode === 'let') return bindings[name];
      throw ReferenceError(`${name} is not defined`);
    };

    class ModuleNamespace {}
    define(ModuleNamespace.prototype, Symbol.toStringTag, 'ModuleNamespace');
    setPrototypeOf(ModuleNamespace.prototype, null);

    return new.target ? new Module(...arguments) : Module(...arguments);
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
