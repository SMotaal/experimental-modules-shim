{
  /// ESX Modules Experiment

  // console.clear();

  const define = (target, property, value, enumerable = false, configurable = false) =>
    Reflect.defineProperty(target, property, {value, enumerable, configurable}) && value;
  const bind = (target, property, get, enumerable = false, configurable = false) =>
    Reflect.defineProperty(target, property, {get, configurable, enumerable});

  function ModuleNamespace() {
    Object.defineProperty(this, Symbol.toStringTag, {
      value: 'ModuleNamespace',
      enumerable: false,
    });
  }
  ModuleNamespace.prototype = null;

  class Module {
    constructor(url, evaluator, imports) {
      const ENUMERABLE = false;
      define(this, 'url', url, ENUMERABLE);
      define(this, 'evaluator', evaluator, ENUMERABLE);
      define(this, 'context', null, ENUMERABLE, true);
      define(this, 'bindings', Object.create(null), ENUMERABLE);
      define(this, 'links', Module.links(imports || `${evaluator}`), ENUMERABLE, false);
      Module.map[url] = this;
    }

    link() {
      const promises = [];
      const imports = {};
      const namespaces = {};
      const bindings = this.bindings;
      const links = this.links;
      for (const binding in links) {
        const {specifier, identifier} = links[binding];
        const dependency =
          imports[specifier] ||
          (imports[specifier] = Module.import(specifier).then(
            namespace => (namespaces[specifier] = namespace),
          ));
        const promise = dependency.then(namespace =>
          identifier === '*'
            ? define(bindings, binding, namespaces[specifier], true)
            : bind(bindings, binding, () => namespaces[specifier][identifier], true),
        );
        promises.push(promise);
        define(bindings, binding, undefined, true, true);
      }
      const promise = Promise.all(Object.values(imports)).then(() => {});
      define(this, 'link', () => promise);
      return promise;
    }

    instantiate() {
      const namespace = new ModuleNamespace();
      const context = define(this, 'context', Object.create(null), false);
      const instance = {namespace, context};
      const promise = this.link().then(() => instance);
      define(this, 'instantiate', () => promise);

      context.exports = (...exports) => void Module.bind(namespace, ...exports);
      context.exports.from = (...exports) => void null;
      context.exports.default = value => void Module.bind(namespace, {default: () => value});
      context.scope = Object.setPrototypeOf(this.bindings, ModuleScope);
      Object.freeze(context);
      return promise;
    }

    async evaluate() {
      const {namespace, context} = await this.instantiate();
      try {
        await this.evaluator(context);
        return define(this, 'namespace', namespace);
      } catch (exception) {
        console.error(exception);
        define(this, 'exception', exception);
      }
    }

    static links(source) {
      // console.log({declarations});
      let match;
      const links = {};
      while ((match = ImportDeclarations.exec(source))) {
        const [declaration, bindings, binding, , specifier] = match;
        const mappings = (
          (binding && ((binding.startsWith('* ') && binding) || `default as ${binding}`)) ||
          bindings ||
          ''
        ).split(/ *, */g);
        // console.log({declaration, bindings, binding, specifier, mappings});
        while ((match = Mappings.exec(mappings))) {
          const [, identifier, as = identifier] = match;
          links[as] = {specifier, identifier};
        }
      }
      return links;
    }

    static bind(namespace, ...bindings) {
      const descriptors = {};
      for (const binding of bindings) {
        const type = typeof binding;
        if (type === 'function') {
          const identifier = (Identifier.exec(binding) || '')[0];
          identifier && bind(namespace, identifier, binding, true);
        } else if (type === 'object') {
          for (const identifier in binding) {
            identifier === (Identifier.exec(identifier) || '')[0] &&
              bind(namespace, identifier, binding[identifier], true);
          }
        }
      }
    }

    static async import(url) {
      const module = this.map[url];
      return module.namespace || (await module.evaluate());
    }
  }

  Module.map = {};

  const raw = String.raw;
  const BindExpression = /^(?:\(?\)?|(\S+)) => (\S+)$/;
  const Identifier = /[^\n\s\(\)\{\}\-=+*/%`"~!&.:^<>,]+/;
  // const Mappings = /[^\n\s\(\)\{\}\-=+*/%`"~!&.:^<>,]+(?: +as +[^\n\s\(\)\{\}\-=+*/%`"~!&.:^<>,]+)?/g;
  const Mappings = /([^\s,]+)(?: +as +([^\s,]+))?/g;
  const ImportDeclarations = /\bimport\b(?: +(?:{ *([^};]*) *}|([*] +as +\S+|\S+)) +from\b|) +(['"])(.*?)\3/g;

  // '\nimport * as a from "a"\nimport "a"\n'.replace(/\bimport\b(?: +(?:{ *([^};])* *}|([*] +as +\S+|\S+)) +from\b|) +(['"])(.*?)\3/g, (...args)=> (console.log(args), args[0]))

  const ModuleScope = (() => {
    const GlobalScope = (1, eval)('this');
    const globals = (({eval, Object}) => ({eval, Object, Module}))(GlobalScope);
    const moduleScope = new Proxy(Object.freeze(Object.setPrototypeOf({...globals}, GlobalScope)), {
      get: (target, property) => {
        if (typeof property !== 'string') return;
        if (property in globals) return globals[property];
        const value = GlobalScope[property];
        return (value && typeof value === 'function' && value.bind(GlobalScope)) || value;
      },
      set: (target, property) => {
        throw ReferenceError(`${property} is not defined`);
      },
    });

    return moduleScope;
  })();

  {
    with (ModuleScope) {
      /// LEVEL 1 — Top-Level Exports
      //* SEE: https://jsbin.com/gist/c50a4dfb97f406278b4a1643b0947a48?source=javascript&result=console
      new Module('exporting', async module => {
        // await module.imports();
        with (module.scope) {
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

    /// LEVEL 2 — Imports
    //* SEE: https://jsbin.com/gist/c50a4dfb97f406278b4a1643b0947a48?source=javascript&result=console
    new Module('importing', async module => {
      // import exporting_default from 'exporting';
      // import * as exporting_start from 'exporting';
      // import {g1, g2} from 'exporting';

      with (module.scope) {
        const $g1 = g1;
        await module.exports(() => $g1);
        await module.exports.default(g1);
      }
    });
  }

  /// LOGGING
  with (ModuleScope) {
    (async () => {
      for (const id in Module.map) {
        console.group(`--- ${id} ---`);
        const result = {};
        try {
          const module = (result['Module'] = Module.map[id]);
          const namespace = (result['Namespace'] = await Module.import(id));
          // result.bindings = {...module.bindings};
          result['Exports'] = {...namespace};
          console.dir(result);
        } catch (exception) {
          console.error(exception);
        } finally {
          console.log(''), console.groupEnd();
        }
      }
    })();
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

// context.scope = new Proxy(ModuleScope, {
//   get: (target, property) => {
//     if (typeof property !== 'string' || property === 'Module') return;
//     if (property in bindings) return bindings[property];
//     return Reflect.get(ModuleScope, property);
//   },
// });
// const linked = Promise.all(Object.values(imports)).then(() => {});
// const bound = Promise.all(promises);
// const dir = object =>
//   Object.entries(object).map(([k, v]) => {
//     console.group('%s', k), console.log(v), console.groupEnd();
//   });
