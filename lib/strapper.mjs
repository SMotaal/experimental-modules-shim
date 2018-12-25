import {ModuleScope} from './scope.mjs';
import {ModuleNamespace} from './namespace.mjs';
import {Identifier, Mappings, BindingDeclarations, Specifier} from './expressions.mjs';

// import {Module} from './module.mjs';

import {
  noop,
  define,
  defineProperty,
  bind,
  copy,
  create,
  freeze,
  setPrototypeOf,
  ResolvedPromise,
} from './helpers.mjs';

const ENUMERABLE = true;

export const ModuleStrapper = (() => {
  return class ModuleStrapper {
    *strap(module) {
      const records = new WeakMap();
    }

    get map() {
      if (this !== this.constructor.prototype) return define(this, 'map', create(null));
    }

    async link(module) {
      const enumerable = true;
      const {namespaces, context, bindings, links} = module;
      const promises = [];
      const imports = {};
      // const dependencies = {[module.url]: true};

      // let context;
      for (const binding in links) {
        const link = links[binding];
        const {intent, specifier, identifier, url} = link;
        if (!url) continue;
        // log({specifier, identifier, url});
        const namespace = namespaces[url];
        // const linked = dependencies[url] || (dependencies[url] = this.map[url].link());
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
          bind(bindings, binding, noop, enumerable, true);
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

    instantiate(module) {
      const enumerable = false;
      const namespace = new ModuleNamespace();
      const {context, bindings, namespaces, url} = module;

      context.export = (...exports) => void this.bind(namespace, ...exports);
      context.export.from = (...links) => {
        for (const link of links) {
          const {intent, specifier, identifier, binding, url} = link;
          if (intent !== 'export') continue;
          url in namespaces
            ? copy(namespace, namespaces[url], identifier, binding)
            : bind(namespace, binding, () => namespaces[url][identifier], enumerable, false);
        }
      };
      defineProperty(context.export, 'default', {
        set: value => void this.bind(namespace, {default: () => value}),
      });
      // context.export.default = value => void this.bind(namespace, {default: () => value});

      define(bindings, 'module', context, false, true);
      define(context, 'scope', setPrototypeOf(bindings, ModuleScope), enumerable, false);
      define(context, 'meta', create(null), false, false);
      define(context.scope, 'meta', context.meta, false, false);
      define(context.meta, 'url', url);
      freeze(context);
      return define(module, 'instance', {namespace, context});
    }

    async evaluate(module) {
      const {bindings, namespace, context} = await module.instantiate();
      try {
        await module.evaluator(context, context.export);
        return define(module, 'namespace', namespace);
      } catch (exception) {
        console.warn(exception);
        define(module, 'exception', exception);
      }
    }

    async import(url) {
      const module = this.map[url];
      return module.namespace || (await module.evaluate());
    }

    resolve(specifier, referrer) {
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

    links(source, referrer) {
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

    bind(namespace, ...bindings) {
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
  };
})();
