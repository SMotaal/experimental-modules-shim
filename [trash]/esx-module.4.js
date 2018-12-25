{
  /// ESX Modules Experiment

  // console.clear();

  const {defineProperty, getOwnPropertyDescriptor} = Reflect;

  const noop = () => {};
  const define = (target, property, value, enumerable = false, configurable = false) =>
    defineProperty(target, property, {value, enumerable, configurable}) && value;
  const bind = (target, property, get, enumerable = false, configurable = false) =>
    defineProperty(target, property, {get, set: noop, configurable, enumerable});
  const copy = (target, source, identifier, alias = identifier) =>
    defineProperty(target, alias, getOwnPropertyDescriptor(source, identifier));

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
      // define(this, 'namespaces', new.target.namespaces || define(new.target.namespaces), ENUMERABLE);
      define(this, 'links', Module.links(imports || `${evaluator}`, url), ENUMERABLE, false);
      this.namespaces || define(new.target.prototype, 'namespaces', {}, false);
      Module.map[url] = this;
    }

    link() {
      const promises = [];
      const imports = {};
      const namespaces = this.namespaces; // || (this.constructor.namespaces = {});
      const bindings = this.bindings;
      const links = this.links;
      const enumerable = true;
      let context;
      for (const binding in links) {
        const link = links[binding];
        const {intent, specifier, identifier, url, key = (link.key = url)} = link;
        // console.log({specifier, identifier, url});
        const namespace = namespaces[key];
        const imported =
          imports[key] ||
          (imports[key] =
            (namespace && resolved) ||
            Module.import(url).then(namespace => {
              bind(namespaces, key, () => namespace, enumerable, false);
            }));
        // console.log(link);
        if (intent === 'import') {
          const promise = imported.then(() => {
            identifier === '*'
              ? copy(bindings, namespaces, specifier, binding)
              : copy(bindings, namespaces[key], identifier, binding);
          });
          promises.push(promise);
          bind(bindings, binding, noop, enumerable, true);
        } else if (intent === 'export') {
          if (!context && !(context = this.context))
            throw Error(`module.link invoked before creation of context`);
          imported.then(() => context.exports.from(link));
        }
      }
      const promise = Promise.all(Object.values(imports)).then(() => {});
      define(this, 'link', () => promise);
      return promise;
    }

    instantiate() {
      const namespace = new ModuleNamespace();

      const context = define(this, 'context', Object.create(null), false);

      // Binding
      context.exports = (...exports) => void Module.bind(namespace, ...exports);
      context.exports.from = (...links) => {
        const namespaces = this.namespaces;
        for (const link of links) {
          const {intent, specifier, identifier, binding, url, key = (link.key = url)} = link;
          // TODO: Track staged proposal for export * as syntax
          copy(namespace, namespaces[key], identifier, binding);
        }
      };
      context.exports.default = value => void Module.bind(namespace, {default: () => value});

      const instance = {namespace, context};
      const promise = this.link().then(() => instance);
      define(this, 'instantiate', () => promise);

      // Scope
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

    static resolve(specifier, referrer) {
      specifier = `${(specifier && specifier) || ''}`;
      referrer = `${(referrer && referrer) || ''}` || '';
      const key = `[${referrer}][${specifier}]`;
      const cache = this.resolve.cache || (this.resolve.cache = {});
      let url = cache[key];
      if (url) return url.link;
      const {schema, domain} = Specifier.parse(specifier);
      const origin = (schema && `${schema}${domain || '//'}`) || `file:///`;
      referrer =
        (!referrer && origin) ||
        (cache[`[${referrer}]`] || (cache[`[${referrer}]`] = new URL(referrer, origin))).href;
      url = cache[key] = new URL(specifier, referrer);
      // console.log({specifier, referrer, origin, schema, domain, url: url.href});
      return (url.link = url.href.replace(/^file:\/\/\//, ''));
    }

    static links(source, referrer) {
      // console.log({declarations});
      let match;
      const links = {};
      while ((match = BindingDeclarations.exec(source))) {
        const [declaration, intent, bindings, binding, , specifier] = match;
        // const intent = declaration.split(' ', 1)[0];
        const mappings = (
          (binding && ((binding.startsWith('* ') && binding) || `default as ${binding}`)) ||
          bindings ||
          ''
        ).split(/ *, */g);
        const url = this.resolve(specifier, referrer);
        // console.log({declaration, bindings, binding, specifier, mappings});
        while ((match = Mappings.exec(mappings))) {
          const [, identifier, binding = identifier] = match;
          links[binding] = {intent, specifier, identifier, binding, url};
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
  const resolved = Promise.resolve();
  const BindExpression = /^(?:\(?\)?|(\S+)) => (\S+)$/;
  const Identifier = /[^\n\s\(\)\{\}\-=+*/%`"~!&.:^<>,]+/;
  const Mappings = /([^\s,]+)(?: +as +([^\s,]+))?/g;
  const BindingDeclarations = /\b(import|export)\b(?: +(?:{ *([^};]*) *}|([*] +as +\S+|\S+)) +from\b|) +(['"])(.*?)\4/g;
  const Specifier = /^(?:([a-z]+[^/]*?:)\/{0,2}(\b[^/]+\/?)?)(\.{0,2}\/)?([^#?]*?)(\?[^#]*?)?(#.*?)?$/u;
  Specifier.parse = specifier => {
    const [url, schema, domain, root, path, query, fragment] = Specifier.exec(specifier) || '';
    return {url, schema, domain, root, path, query, fragment, specifier};
  };

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
      /// LEVEL 1 — Direct Exports
      //* SEE: https://jsbin.com/gist/c50a4dfb97f406278b4a1643b0947a48?source=javascript&result=console
      new Module('direct-exports', async module => {
        // await module.imports();
        with (module.scope) {
          /* ECMAScript Object Context */
          const defaults = Object.create(null);

          maybe(() => (Object = 1));

          /* Exported Top-level Variables */
          var q;
          module.exports(() => q);

          const TWO = 2;
          module.exports(() => TWO);

          let {y = {}} = defaults;
          module.exports(() => y);

          module.exports.default(defaults);

          /* Exported Top-level Functions and Classes */
          function g1() {} // hoists expected
          module.exports(() => g1); // exports when expected

          async function g2() {} // hoists expected
          module.exports(() => g2); // exports when expected

          function* g3() {} // hoists expected
          module.exports(() => g3); // exports when expected

          class G1 {} // does not hoist expected
          module.exports(() => G1); // exports when expected
        }
      });
    }

    /// LEVEL 2 — Direct Imports
    //* SEE: https://jsbin.com/gist/7e32803e6070b2591aebe51894644e67?result=console
    new Module('direct-imports', async module => {
      // import direct_exports_default from 'direct-exports';
      // import * as direct_exports from 'direct-exports';
      // import {g1, g2} from 'direct-exports';

      with (module.scope) {
        const $g1 = g1;
        module.exports(() => $g1);
        module.exports.default({g1, g2, direct_exports_default, direct_exports});
      }
    });

    /// LEVEL 3 — Indirect Exports
    //* SEE: https://jsbin.com/gist/7e32803e6070b2591aebe51894644e67?result=console
    new Module('indirect-exports', async module => {
      // export {g1, g2} from 'direct-exports';
      // import * as direct_exports from 'direct-exports';
      // import * as direct_imports from 'direct-imports';

      with (module.scope) {
        module.exports.default({direct_imports, direct_exports});
      }
    });
  }

  /// LOGGING
  with (ModuleScope) {
    setTimeout(async () => {
      const {log, dir, error, group, groupEnd} = console;
      const ids = Object.keys(Module.map); // .reverse();
      // for (let n = 10, k = [...ids]; n--; ids.push(...k.reverse(), ...k.reverse()));
      const mark = `Done: ${ids.length} Modules`;
      console.time(mark);
      // const ids = ['importing'];
      for (const id of ids) {
        group(`Import "${id}"`);
        try {
          const result = {};
          const module = (result['Module'] = Module.map[id]);
          // const namespace = (result['Namespace'] = await Module.import(id));
          const namespace = await Module.import(id);
          // result.bindings = {...module.bindings};
          result['Exports'] = {...namespace};
          dir(result);
        } catch (exception) {
          error(exception);
        } finally {
          groupEnd();
        }
      }
      console.timeEnd(mark);
    }, 1000 * typeof self === 'object');
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
// const Mappings = /[^\n\s\(\)\{\}\-=+*/%`"~!&.:^<>,]+(?: +as +[^\n\s\(\)\{\}\-=+*/%`"~!&.:^<>,]+)?/g;
// const DefaultSchema = /^module:/;
// '\nimport * as a from "a"\nimport "a"\n'.replace(/\bimport\b(?: +(?:{ *([^};])* *}|([*] +as +\S+|\S+)) +from\b|) +(['"])(.*?)\3/g, (...args)=> (console.log(args), args[0]))
// const ImportDeclarations = /\bimport\b(?: +(?:{ *([^};]*) *}|([*] +as +\S+|\S+)) +from\b|) +(['"])(.*?)\3/g;
