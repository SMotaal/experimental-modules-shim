console.clear();
setTimeout(async () => {
  /// ESX Modules Experiment

  // const ModuleScope = getModuleScope();

  with (getModuleScope()) {
    const LEVEL = 3;
    /// LEVEL 1 — Direct Exports
    //* SEE: https://jsbin.com/gist/c50a4dfb97f406278b4a1643b0947a48?source=javascript&result=console
    if (LEVEL >= 1) {
      new Module('direct-exports', async (module, exports = module.export) => {
        with (module.scope)
          ((module, exports) => {
            'use strict';
            exports(() => q, () => TWO, () => y, () => g1, () => g2, () => g3, () => G1);

            const defaults = new class Defaults {}();

            maybe(() => (Object = 1));
            // throw Error('haha!');

            var q;
            const TWO = 2;
            let {y = {}} = defaults;
            function g1() {}
            async function g2() {}
            function* g3() {}
            class G1 {}

            exports.default(defaults);
          })(module, exports);
      });
    }

    /// LEVEL 2 — Direct Imports
    //* SEE: https://jsbin.com/gist/7e32803e6070b2591aebe51894644e67?result=console
    if (LEVEL >= 2) {
      new Module('direct-imports', async module => {
        with (module.scope)
          (async () => {
            'use strict';
            `import direct_exports_default from './direct-exports'`;
            `import * as direct_exports from './direct-exports'`;
            `import {g1, g2} from './direct-exports'`;
            module.export(() => $g1);

            const $g1 = g1;
            module.export.default({g1, g2, direct_exports_default, direct_exports});
          })();
      });
    }

    /// LEVEL 3 — Indirect Exports
    //* SEE: https://jsbin.com/gist/7e32803e6070b2591aebe51894644e67?result=console
    if (LEVEL >= 3) {
      new Module('indirect-exports', module => {
        with (module.scope)
          (async () => {
            'use strict';
            `export {g1 as export_g1, g2 as export_g2, default as export_direct_exports_default } from './direct-exports'`;
            `export {default as export_direct_imports_default } from './direct-exports'`;
            `import * as direct_exports from './direct-exports'`;
            `import * as direct_imports from './direct-imports'`;

            console.trace('indirect-exports');
            module.export.default({direct_imports, direct_exports});
          })();
      });
    }

    /// LEVEL 4 — Circular Imports
    //* SEE: https://jsbin.com/gist/7e32803e6070b2591aebe51894644e67?result=console
    if (LEVEL >= 4) {
      new Module('circular-imports-1', module => {
        with (module.scope)
          (async () => {
            'use strict';
            `import {a as a2, b as b2, c as c2} from './circular-imports-2'`;
            `export {a, b, c}`;
            module.export(() => a, () => b, () => c);

            const n = (typeof a1 === 'string' && 2) || 1;
            let a, b, c;
            a = (() => (n === 1 ? 'a1' : `${a1} a2`))();
            b = (() => (n === 1 ? `${a1} b1` : `${b1} b2`))();
            c = (() => (n === 1 ? `${a1} c1` : `${c1} c2`))();

            module.export.default({a, b, c});
          })();
      });
      new Module('circular-imports-2', module => {
        with (module.scope)
          (async () => {
            'use strict';
            `import {a as a1, b as b1, c as c1} from './circular-imports-1'`;
            `export {a, b, c}`;
            module.export(() => a, () => b, () => c);

            const n = (typeof a1 === 'string' && 2) || 1;
            let a, b, c;
            a = (() => (n === 1 ? 'a1' : `${a1} a2`))();
            b = (() => (n === 1 ? `${a2} b1` : `${b1} b2`))();
            c = (() => (n === 1 ? `${b2} c1` : `${c1} c2`))();

            module.export.default({a, b, c});
          })();
      });
    }
  }

  /// LOGGING
  with (getModuleScope()) {
    setTimeout(async (CYCLES) => {
      const {log, dir, error, group, groupEnd} = console;
      const ids = Object.keys(Module.map);
      // ids.reverse();
      if (CYCLES) for (let n = CYCLES, k = ids.concat([...ids].reverse()); n--; ids.push(...k));
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
          error(exception);
        } finally {
          groupEnd();
        }
      }
      console.timeEnd(mark);
    }, 1000 * typeof self === 'object');
  }
}, 0);

function getModuleScope() {
  const {defineProperty, getOwnPropertyDescriptor} = Reflect;
  const {freeze, setPrototypeOf, getOwnPropertyDescriptors} = Object;
  const {log, warn} = console;
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
  // const BindingDeclarations = /\b(import|export)\b(?: +(?:{ *([^};]*) *}|([*] +as +\S+|\S+)) +from\b|) +(['"])(.*?)\4/g;
  // const BindingDeclarations = /\b(import|export)\b(?: +(?:{ *([^};]*) *}|([*] +as +\S+|\S+)) +from\b|(?= +['"]))(?: +(['"])(.*?)\4| *;? *\n)/g;
  const BindingDeclarations = /\b(import|export)\b +(?:{ *(.*?) *}|([*] +as +\S+|\S+)|)(?: +from\b|)(?: +(['"])(.*?)\4|)/g;
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
      const instance = this.instance || Module.instantiate(this);
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
        if (!url) continue;
        // log({specifier, identifier, url});
        const namespace = namespaces[url];
        // const linked = dependencies[url] || (dependencies[url] = Module.map[url].link());
        const imported =
          url &&
          (imports[url] ||
            (imports[url] = (namespace && ResolvedPromise) || namespaces.import(url)));
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
      const ENUMERABLE = false;
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

      const scope = setPrototypeOf(bindings, ModuleScope);
      define(bindings, 'module', context, false, true);
      define(context, 'scope', scope, ENUMERABLE, false);
      freeze(context);
      return define(module, 'instance', {namespace, context});
    }

    static async evaluate(module) {
      const {bindings, namespace, context} = await module.instantiate();
      try {
        await module.evaluator(context, context.export);
        return define(module, 'namespace', namespace);
      } catch (exception) {
        // warn(exception);
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
        // log(match[0]);
        const [declaration, intent, bindings, binding, , specifier] = match;
        const mappings = (
          (binding && ((binding.startsWith('* ') && binding) || `default as ${binding}`)) ||
          bindings ||
          ''
        ).split(/ *, */g);
        const url = (specifier && this.resolve(specifier, referrer)) || undefined;
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
  setPrototypeOf(Module, Module.prototype);

  function ModuleNamespace() {
    defineProperty(this, Symbol.toStringTag, {value: 'ModuleNamespace', enumerable: false});
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
    const globals = (({eval, Object}) => ({eval, Object, Module}))(GlobalScope);
    const moduleScope = new Proxy(freeze(setPrototypeOf({...globals}, GlobalScope)), {
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
    console.warn(restack(exception, /^(.*?\n)([^]*\bmaybe\b.*?\n)/));
  }
}
