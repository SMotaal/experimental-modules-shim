(async () => {
  /// ESX Modules Experiment

  // const ModuleScope = getModuleScope();

  with (getModuleScope({LEVEL: 3})) {
    /// LEVEL 1 — Direct Exports
    //* SEE: https://jsbin.com/gist/c50a4dfb97f406278b4a1643b0947a48?source=javascript&result=console
    if (LEVEL >= 1) {
      new Module('direct-exports', async module => {
        with (module.scope) {
          const defaults = new class Defaults {}();

          maybe(() => (Object = 1));
          // throw Error('haha!');

          var q;
          await module.export(() => q);

          const TWO = 2;
          await module.export(() => TWO);

          let {y = {}} = defaults;
          await module.export(() => y);

          function g1() {}
          await module.export(() => g1);

          async function g2() {}
          await module.export(() => g2);

          function* g3() {}
          await module.export(() => g3);

          class G1 {}
          await module.export(() => G1);

          await module.export.default(defaults);
        }
      });
    }

    /// LEVEL 2 — Direct Imports
    //* SEE: https://jsbin.com/gist/7e32803e6070b2591aebe51894644e67?result=console
    if (LEVEL >= 2) {
      new Module('direct-imports', async module => {
        // import direct_exports_default from './direct-exports';
        // import * as direct_exports from './direct-exports';
        // import {g1, g2} from './direct-exports';
        with (module.scope) {
          const $g1 = g1;
          await module.export(() => $g1);
          await module.export.default({g1, g2, direct_exports_default, direct_exports});
        }
      });
    }

    /// LEVEL 3 — Indirect Exports
    //* SEE: https://jsbin.com/gist/7e32803e6070b2591aebe51894644e67?result=console
    if (LEVEL >= 3) {
      new Module('indirect-exports', async module => {
        // export {g1 as export_g1, g2 as export_g2, default as export_direct_exports_default } from './direct-exports';
        // export {default as export_direct_imports_default } from './direct-exports';
        // import * as direct_exports from './direct-exports';
        // import * as direct_imports from './direct-imports';

        with (module.scope) {
          console.trace('indirect-exports');
          await module.export.default({direct_imports, direct_exports});
        }
      });
    }

    /// LEVEL 4 — Circular Imports
    //* SEE: https://jsbin.com/gist/7e32803e6070b2591aebe51894644e67?result=console
    if (LEVEL >= 4) {
      new Module('circular-imports-1', async module => {
        // import {a as a2, b as b2, c as c2} from './circular-imports-2';
        with (module.scope) {
          const n = (typeof a1 === 'string' && 2) || 1;
          await module.export(() => a);
          await module.export(() => b);
          await module.export(() => c);
          let a, b, c;
          a = (() => n === 1 ? 'a1' : `${a1} a2`)();
          b = (() => n === 1 ? `${a1} b1` : `${b1} b2`)();
          c = (() => n === 1 ? `${a1} c1` : `${c1} c2`)();
          // await module.export.default({a, b, c});
        }
      });
      new Module('circular-imports-2', async module => {
        // import {a as a1, b as b1, c as c1} from './circular-imports-1';
        with (module.scope) {
          const n = (typeof a1 === 'string' && 2) || 1;
          await module.export(() => a);
          await module.export(() => b);
          await module.export(() => c);
          let a, b, c;
          a = (() => n === 1 ? 'a1' : `${a1} a2`)();
          b = (() => n === 1 ? `${a2} b1` : `${b1} b2`)();
          c = (() => n === 1 ? `${b2} c1` : `${c1} c2`)();
          // await module.export.default({a, b, c});
        }
      });
    }
  }

  /// LOGGING
  with (getModuleScope()) {
    setTimeout(async () => {
      const {log, dir, error, group, groupEnd} = console;
      const ids = Object.keys(Module.map);
      // ids.reverse();
      // for (let n = 10, k = ids.concat([...ids].reverse()); n--; ids.push(...k));
      const mark = `Done: ${ids.length} Modules`;
      console.time(mark);
      const namespaces = new Set();
      for (const id of ids) {
        group(`Import "${id}"`);
        try {
          const result = {};
          const module = (result['Module'] = Module.map[id]);
          const namespace = await Module.import(id);
          if (!namespaces.has(namespace) && namespaces.add(namespace)) {
            result['Exports'] = {...namespace};
            dir(result);
          }
        } catch (exception) {
          // error(exception);
        } finally {
          groupEnd();
        }
      }
      console.timeEnd(mark);
    }, 1000 * typeof self === 'object');
  }
})();

function getModuleScope({LEVEL = 3} = {}) {
  const {defineProperty, getOwnPropertyDescriptor} = Reflect;
  const {setPrototypeOf, getOwnPropertyDescriptors} = Object;
  const {log, error} = console;
  const noop = () => {};
  const define = (target, property, value, enumerable = false, configurable = false) =>
    defineProperty(target, property, {value, enumerable, configurable}) && value;
  const bind = (target, property, get, enumerable = false, configurable = false) =>
    defineProperty(target, property, {get, set: noop, configurable, enumerable});
  const copy = (target, source, identifier, alias = identifier) =>
    defineProperty(target, alias, getOwnPropertyDescriptor(source, identifier));

  const raw = String.raw;
  const ResolvedPromise = Promise.resolve();
  const BindExpression = /^(?:\(?\)?|(\S+)) => (\S+)$/;
  const Identifier = /[^\n\s\(\)\{\}\-=+*/%`"~!&.:^<>,]+/;
  const Mappings = /([^\s,]+)(?: +as +([^\s,]+))?/g;
  const BindingDeclarations = /\b(import|export)\b(?: +(?:{ *([^};]*) *}|([*] +as +\S+|\S+)) +from\b|) +(['"])(.*?)\4/g;
  const Specifier = /^(?:([a-z]+[^/]*?:)\/{0,2}(\b[^/]+\/?)?)(\.{0,2}\/)?([^#?]*?)(\?[^#]*?)?(#.*?)?$/u;
  Specifier.parse = specifier => {
    const [url, schema, domain, root, path, query, fragment] = Specifier.exec(specifier) || '';
    return {url, schema, domain, root, path, query, fragment, specifier};
  };

  class Module {
    constructor(url, evaluator, imports) {
      const ENUMERABLE = false;
      define(this, 'url', url, ENUMERABLE);
      define(this, 'evaluator', evaluator, ENUMERABLE);
      // define(this, 'context', null, ENUMERABLE, true);
      define(this, 'context', Object.create(null), ENUMERABLE, false);
      define(this, 'bindings', Object.create(null), ENUMERABLE);
      define(this, 'links', Module.links(imports || `${evaluator}`, url), ENUMERABLE, false);
      this.namespaces || define(new.target.prototype, 'namespaces', new ModuleNamespaces(), false);
      Module.map[url] = this;
    }

    link() {
      const promise = Module.link(this);
      define(this, 'link', () => promise);
      return promise;
    }

    instantiate() {
      const instance = module.instance || Module.instantiate(this);
      const promise = this.link().then(() => instance);
      define(this, 'instantiate', () => promise);
      return promise;
    }

    evaluate() {
      // if (this.exception) throw this.exception;
      const promise = Module.evaluate(this).then(() => this.namespace);
      define(this, 'evaluate', () => promise);
      return promise;
    }

    static async link(module) {
      const ENUMERABLE = true;
      const {namespaces, context, bindings, links} = module;
      const promises = [];
      const imports = {};
      const dependencies = {[module.url]: true};

      // let context;
      for (const binding in links) {
        const link = links[binding];
        const {intent, specifier, identifier, url} = link;
        // log({specifier, identifier, url});
        const namespace = namespaces[url];
        // const linked = dependencies[url] || (dependencies[url] = Module.map[url].link());
        const imported =
          imports[url] ||
          (imports[url] =
            (namespace && ResolvedPromise) ||
            namespaces.import(url).then(() => {
              // const module = Module.map[url];
              // module.instance || Module.instantiate(module);
              // Module.map[url].link();
            }));
        if (intent === 'import') {
          bind(bindings, binding, noop, ENUMERABLE, true);
          await imported;
          identifier === '*'
            ? copy(bindings, namespaces, url, binding)
            : copy(bindings, namespaces[url], identifier, binding);
        } else if (intent === 'export') {
          // await imported;
          context.export.from(link);
        }

        if (intent === 'import') {
          promises.push(
            imported.then(() => {
              identifier === '*'
                ? copy(bindings, namespaces, url, binding)
                : copy(bindings, namespaces[url], identifier, binding);
            }),
          );
          bind(bindings, binding, noop, ENUMERABLE, true);
        } else if (intent === 'export') {
          (await this.instance) || Module.instantiate(this);
          promises.push(
            imported.then(async () => {
              context.export.from(link);
            }),
          );
        }
      }

      await Promise.all(promises);
    }

    static instantiate(module) {
      const ENUMERABLE = true;
      const namespace = new ModuleNamespace();
      const {context, bindings, namespaces} = module;
      context.export = (...exports) => void Module.bind(namespace, ...exports);
      context.export.from = (...links) => {
        for (const link of links) {
          const {intent, specifier, identifier, binding, url} = link;
          if (intent !== 'export') continue;
          url in namespaces
            ? copy(namespace, namespaces[url], identifier, binding)
            : bind(namespace, binding, () => namespaces[url][identifier], ENUMERABLE, false);
        }
      };
      context.export.default = value => void Module.bind(namespace, {default: () => value});
      const initialize = () => {
        const scope = Object.setPrototypeOf(bindings, ModuleScope);
        define(context, 'scope', scope, ENUMERABLE, false);
        return Object.freeze(context), scope;
      };
      bind(context, 'scope', initialize, ENUMERABLE, true);

      return define(module, 'instance', {namespace, context});

      // return module.link();
    }

    static async evaluate(module) {
      const {namespace, context} = await module.instantiate();
      try {
        await module.evaluator(context);
        return define(module, 'namespace', namespace);
      } catch (exception) {
        // console.error(exception);
        define(module, 'exception', exception);
      }
    }

    static async import(url) {
      const module = this.map[url];
      return module.namespace || (await module.evaluate());
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
      // log({specifier, referrer, origin, schema, domain, url: url.href});
      return (url.link = url.href.replace(/^file:\/\/\//, ''));
    }

    static links(source, referrer) {
      // log({declarations});
      let match;
      const links = {};
      while ((match = BindingDeclarations.exec(source))) {
        const [declaration, intent, bindings, binding, , specifier] = match;
        const mappings = (
          (binding && ((binding.startsWith('* ') && binding) || `default as ${binding}`)) ||
          bindings ||
          ''
        ).split(/ *, */g);
        const url = this.resolve(specifier, referrer);
        // log({declaration, bindings, binding, specifier, mappings});
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
  }

  Module.map = {};

  function ModuleNamespace() {
    Object.defineProperty(this, Symbol.toStringTag, {
      value: 'ModuleNamespace',
      enumerable: false,
    });
  }

  ModuleNamespace.prototype = null;

  class ModuleNamespaces {
    import(url) {
      return (
        this[url] ||
        define(this, url, Module.import(url).then(
          namespace => (bind(this, url, () => namespace, true, false), namespace),
        ), true, true)
      );
    }
  }

  const ModuleScope = (() => {
    const GlobalScope = (1, eval)('this');
    const switches = Switches();
    const globals = (({eval, Object}) => ({eval, Object, Module, ...switches}))(GlobalScope);
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

    function Switches(switches = {LEVEL}) {
      const {process, location} = GlobalScope;
      if (process && process.argv) {
        for (const arg of process.argv.slice(2)) {
          let [k, v = true] = arg.split(/=|(?=[0-9])/, 2);
          const type = typeof switches[(k = k.toUpperCase())];
          k in switches && v && (switches[k] = type === 'number' ? (v = parseInt(v)) : v);
        }
      }
      return switches;
    }
  })();

  getModuleScope = () => ModuleScope;

  return ModuleScope;
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
