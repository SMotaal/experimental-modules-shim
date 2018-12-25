const {defineProperty, getOwnPropertyDescriptor} = Reflect;
const {create, freeze, setPrototypeOf} = Object;

const noop = () => {};

const define = (target, property, value, enumerable = false, configurable = false) =>
  defineProperty(target, property, {value, enumerable, configurable}) && value;

const bind = (target, property, get, enumerable = false, configurable = false) =>
  defineProperty(target, property, {get, set: noop, configurable, enumerable});

const copy = (target, source, identifier, alias = identifier) =>
  defineProperty(target, alias, getOwnPropertyDescriptor(source, identifier));

const ResolvedPromise = Promise.resolve();

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

/// ECMAScript Expressions

/** Mapped binding: `Identifier as BindingIdentifier` */
const Mappings = /([^\s,]+)(?: +as +([^\s,]+))?/g;

/** Quoted export mappings: `export {…}` */
const Exports = /`export *{([^}`;\*]*)}`/gm;

/** Nothing but Identifier Characters */
const Identifier = /[^\n\s\(\)\{\}\-=+*/%`"'~!&.:^<>,]+/;

const BindingDeclarations = /\b(import|export)\b +(?:{ *([^}]*?) *}|([*] +as +\S+|\S+)|)(?: +from\b|)(?: +(['"])(.*?)\4|)/g;

const Specifier = /^(?:([a-z]+[^/]*?:)\/{0,2}(\b[^/]+\/?)?)(\.{0,2}\/)?([^#?]*?)(\?[^#]*?)?(#.*?)?$/u;

Specifier.parse = specifier => {
  const [url, schema, domain, root, path, query, fragment] = Specifier.exec(specifier) || '';
  return {url, schema, domain, root, path, query, fragment, specifier};
};

const evaluate = code => (0, eval)(code);

const wrap = (body, source) => `
((module, exports) => {
  module.debug('module-url', module.meta.url);
  module.debug('body-text', ${JSON.stringify(body)});
  module.debug('source-text', ${JSON.stringify(source)});
  with(module.scope) (function () {
    "use strict";
    ${body}
  })();
})
`;

const rewrite = source =>
  source.replace(Exports, (match, mappings) => {
    let bindings = [];
    while ((match = Mappings.exec(mappings))) {
      const [, identifier, binding] = match;
      bindings.push(`${binding || '()'} => ${identifier}`);
    }
    return (bindings.length && `exports(${bindings.join(', ')})`) || '';
  });

const parseFunction = source =>
  (typeof source === 'function' &&
    /^\(module, exports\) *=> *{([^]*)}$|/.exec(`${source}`.trim())[1]) ||
  '';

const ModuleEvaluator = (
  source,
  sourceText = (typeof source === 'function' && parseFunction(source)) || source,
) => evaluate(wrap(rewrite(sourceText), sourceText));

function ModuleNamespace() {}
{
  const toPrimitive = setPrototypeOf(() => 'ModuleNamespace', null);
  const toString = setPrototypeOf(() => 'class ModuleNamespace {}', null);
  ModuleNamespace.prototype = create(null, {
    [Symbol.toPrimitive]: {value: toPrimitive, enumerable: false},
    [Symbol.toStringTag]: {value: 'ModuleNamespace', enumerable: false},
  });
  freeze(setPrototypeOf(ModuleNamespace, create(null, {toString: {value: toString}})));
}

const ModuleStrapper = (() => {
  return class ModuleStrapper {
    *strap(module) {
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

class Module {
  constructor(url, evaluator, imports) {
    const enumerable = false;
    define(this, 'url', url, enumerable);
    define(this, 'evaluator', ModuleEvaluator(evaluator), enumerable);
    define(this, 'context', create(null, contextuals), enumerable, false);
    define(this, 'bindings', create(null), enumerable);
    define(this, 'links', Module.links(imports || `${evaluator}`, url), enumerable, false);
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
    const promise = Module.evaluate(this).then(() => this.namespace);
    define(this, 'evaluate', () => promise);
    return promise;
  }
}

/** Properties injected into every module context */
const contextuals = {};

Module.debugging = (() => {
  const debug = (type, ...args) => {
    console.log(type, ...args);
    // type in debugging && debugging[type] null, args);
  };
  const debugging = (debug.debugging = {});
  contextuals.debug = {value: freeze(debug)};
  return debugging;
})();

setPrototypeOf(Module, new ModuleStrapper());

const GlobalScope =
  (typeof self === 'object' && self && self.self) ||
  (typeof global === 'object' && global && global.global) ||
  (() => (0, eval)('this'))();

const globals = (({eval: $eval}) => ({
  eval: $eval,
  Module,
}))(GlobalScope);

const scope = freeze(setPrototypeOf({...globals}, GlobalScope));

const locals = {};

const ModuleScope = new Proxy(scope, {
  get: (target, property, receiver) => {
    if (property in globals) return globals[property];
    const value =
      property in GlobalScope && typeof property === 'string' ? GlobalScope[property] : undefined;
    if (value && typeof value === 'function') {
      const local = locals[property];
      const {proxy} =
        (local && local.value === value && local) ||
        (locals[property] = {
          value,
          proxy: new Proxy(value, {
            construct: (constructor, argArray, newTarget) =>
              Reflect.construct(value, argArray, newTarget),
            apply: (method, thisArg, argArray) =>
              thisArg == null || thisArg === receiver
                ? value(...argArray)
                : Reflect.apply(value, thisArg, argArray),
          }),
        });
      return proxy;
    }
    return value;
  },
  set: (globals, property) => {
    throw ReferenceError(`${property} is not defined`);
  },
});

GlobalScope.ModuleScope = ModuleScope;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlcy5tanMiLCJzb3VyY2VzIjpbIi4uL2xpYi9oZWxwZXJzLm1qcyIsIi4uL2xpYi9uYW1lc3BhY2VzLm1qcyIsIi4uL2xpYi9leHByZXNzaW9ucy5tanMiLCIuLi9saWIvZXZhbHVhdG9yLm1qcyIsIi4uL2xpYi9uYW1lc3BhY2UubWpzIiwiLi4vbGliL3N0cmFwcGVyLm1qcyIsIi4uL2xpYi9tb2R1bGUubWpzIiwiLi4vbGliL3Njb3BlLm1qcyIsIi4uL2xpYi9tb2R1bGVzLm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3Qge2RlZmluZVByb3BlcnR5LCBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3J9ID0gUmVmbGVjdDtcbmV4cG9ydCBjb25zdCB7Y3JlYXRlLCBmcmVlemUsIHNldFByb3RvdHlwZU9mfSA9IE9iamVjdDtcblxuZXhwb3J0IGNvbnN0IG5vb3AgPSAoKSA9PiB7fTtcblxuZXhwb3J0IGNvbnN0IGRlZmluZSA9ICh0YXJnZXQsIHByb3BlcnR5LCB2YWx1ZSwgZW51bWVyYWJsZSA9IGZhbHNlLCBjb25maWd1cmFibGUgPSBmYWxzZSkgPT5cbiAgZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwcm9wZXJ0eSwge3ZhbHVlLCBlbnVtZXJhYmxlLCBjb25maWd1cmFibGV9KSAmJiB2YWx1ZTtcblxuZXhwb3J0IGNvbnN0IGJpbmQgPSAodGFyZ2V0LCBwcm9wZXJ0eSwgZ2V0LCBlbnVtZXJhYmxlID0gZmFsc2UsIGNvbmZpZ3VyYWJsZSA9IGZhbHNlKSA9PlxuICBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHByb3BlcnR5LCB7Z2V0LCBzZXQ6IG5vb3AsIGNvbmZpZ3VyYWJsZSwgZW51bWVyYWJsZX0pO1xuXG5leHBvcnQgY29uc3QgY29weSA9ICh0YXJnZXQsIHNvdXJjZSwgaWRlbnRpZmllciwgYWxpYXMgPSBpZGVudGlmaWVyKSA9PlxuICBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGFsaWFzLCBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc291cmNlLCBpZGVudGlmaWVyKSk7XG5cbmV4cG9ydCBjb25zdCBSZXNvbHZlZFByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcbiIsImltcG9ydCB7TW9kdWxlfSBmcm9tICcuL21vZHVsZS5tanMnO1xuaW1wb3J0IHtkZWZpbmUsIGJpbmR9IGZyb20gJy4vaGVscGVycy5tanMnO1xuXG5leHBvcnQgY2xhc3MgTW9kdWxlTmFtZXNwYWNlcyB7XG4gIGltcG9ydCh1cmwpIHtcbiAgICByZXR1cm4gKFxuICAgICAgdGhpc1t1cmxdIHx8XG4gICAgICBkZWZpbmUodGhpcywgdXJsLCBNb2R1bGUuaW1wb3J0KHVybCkudGhlbihcbiAgICAgICAgbmFtZXNwYWNlID0+IChiaW5kKHRoaXMsIHVybCwgKCkgPT4gbmFtZXNwYWNlLCB0cnVlLCBmYWxzZSksIG5hbWVzcGFjZSksXG4gICAgICApLCB0cnVlLCB0cnVlKVxuICAgICk7XG4gIH1cbn1cbiIsIi8vLyBFQ01BU2NyaXB0IEV4cHJlc3Npb25zXG5cbi8qKiBFQ01BU2NyaXB0IHF1b3RlZCBzdHJpbmdzOiBgJ+KApidgIG9yIGBcIuKAplwiYCAgKi9cbmV4cG9ydCBjb25zdCBTdHJpbmdMaXRlcmFsID0gL1wiKD86W15cXFxcXCJdK3xcXFxcLikqKD86XCJ8JCl8Jyg/OlteXFxcXCddK3xcXFxcLikqKD86J3wkKS9nO1xuXG4vKiogRUNNQVNjcmlwdCBjb21tZW50cyAqL1xuZXhwb3J0IGNvbnN0IENvbW1lbnRzID0gL1xcL1xcLy4qKD86XFxufCQpfFxcL1xcKlteXSo/KD86XFwqXFwvfCQpfF5cXCNcXCEuKlxcbi9nO1xuXG4vKiogRUNNQVNjcmlwdCByZWd1bGFyIGV4cHJlc3Npb25zICAqL1xuZXhwb3J0IGNvbnN0IFJlZ0V4cHMgPSAvXFwvKD89W15cXCpcXC9cXG5dW15cXG5dKlxcLykoPzpbXlxcXFxcXC9cXG5cXHRcXFtdK3xcXFxcXFxTfFxcWyg/OlxcXFxcXFN8W15cXFxcXFxuXFx0XFxdXSspKz9cXF0pKz9cXC9bYS16XSovZztcblxuLy8vIEN1c3RvbSBFeHByZXNzaW9uc1xuXG4vKiogQ29tbWEgd2l0aCBzdXJyb3VuZGluZyB3aGl0ZXNwYWNlICovXG5leHBvcnQgY29uc3QgU2VwYXJhdG9yID0gL1tcXHNcXG5dKixbXFxzXFxuXSovO1xuXG4vKiogTWFwcGVkIGJpbmRpbmc6IGBJZGVudGlmaWVyIGFzIEJpbmRpbmdJZGVudGlmaWVyYCAqL1xuZXhwb3J0IGNvbnN0IE1hcHBpbmdzID0gLyhbXlxccyxdKykoPzogK2FzICsoW15cXHMsXSspKT8vZztcblxuLyoqIFF1b3RlZCBleHBvcnQgbWFwcGluZ3M6IGBleHBvcnQge+KApn1gICovXG5leHBvcnQgY29uc3QgRXhwb3J0cyA9IC9gZXhwb3J0ICp7KFtefWA7XFwqXSopfWAvZ207XG5cbi8qKiBOb3RoaW5nIGJ1dCBJZGVudGlmaWVyIENoYXJhY3RlcnMgKi9cbmV4cG9ydCBjb25zdCBJZGVudGlmaWVyID0gL1teXFxuXFxzXFwoXFwpXFx7XFx9XFwtPSsqLyVgXCInfiEmLjpePD4sXSsvO1xuXG5leHBvcnQgY29uc3QgQmluZGluZ3MgPSAvXFxiKGltcG9ydHxleHBvcnQpXFxiICsoPzp7ICooW159XSo/KSAqfXwoWypdICthcyArXFxTK3xcXFMrKXwpKD86ICtmcm9tXFxifCkoPzogKyhbJ1wiXSkoLio/KVxcNHwoPzpjb25zdHxsZXR8dmFyKSArKD86eyAqKFtefV0qPykgKn18XFxTKyl8KS9nO1xuXG5leHBvcnQgY29uc3QgQmluZGluZ0RlY2xhcmF0aW9ucyA9IC9cXGIoaW1wb3J0fGV4cG9ydClcXGIgKyg/OnsgKihbXn1dKj8pICp9fChbKl0gK2FzICtcXFMrfFxcUyspfCkoPzogK2Zyb21cXGJ8KSg/OiArKFsnXCJdKSguKj8pXFw0fCkvZztcblxuZXhwb3J0IGNvbnN0IFNwZWNpZmllciA9IC9eKD86KFthLXpdK1teL10qPzopXFwvezAsMn0oXFxiW14vXStcXC8/KT8pKFxcLnswLDJ9XFwvKT8oW14jP10qPykoXFw/W14jXSo/KT8oIy4qPyk/JC91O1xuXG5TcGVjaWZpZXIucGFyc2UgPSBzcGVjaWZpZXIgPT4ge1xuICBjb25zdCBbdXJsLCBzY2hlbWEsIGRvbWFpbiwgcm9vdCwgcGF0aCwgcXVlcnksIGZyYWdtZW50XSA9IFNwZWNpZmllci5leGVjKHNwZWNpZmllcikgfHwgJyc7XG4gIHJldHVybiB7dXJsLCBzY2hlbWEsIGRvbWFpbiwgcm9vdCwgcGF0aCwgcXVlcnksIGZyYWdtZW50LCBzcGVjaWZpZXJ9O1xufTtcbiIsImltcG9ydCB7RXhwb3J0cywgTWFwcGluZ3N9IGZyb20gJy4vZXhwcmVzc2lvbnMubWpzJztcblxuY29uc3QgZXZhbHVhdGUgPSBjb2RlID0+ICgxLCBldmFsKShjb2RlKTtcblxuY29uc3Qgd3JhcCA9IChib2R5LCBzb3VyY2UpID0+IGBcbigobW9kdWxlLCBleHBvcnRzKSA9PiB7XG4gIG1vZHVsZS5kZWJ1ZygnbW9kdWxlLXVybCcsIG1vZHVsZS5tZXRhLnVybCk7XG4gIG1vZHVsZS5kZWJ1ZygnYm9keS10ZXh0JywgJHtKU09OLnN0cmluZ2lmeShib2R5KX0pO1xuICBtb2R1bGUuZGVidWcoJ3NvdXJjZS10ZXh0JywgJHtKU09OLnN0cmluZ2lmeShzb3VyY2UpfSk7XG4gIHdpdGgobW9kdWxlLnNjb3BlKSAoZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgICR7Ym9keX1cbiAgfSkoKTtcbn0pXG5gO1xuXG5jb25zdCByZXdyaXRlID0gc291cmNlID0+XG4gIHNvdXJjZS5yZXBsYWNlKEV4cG9ydHMsIChtYXRjaCwgbWFwcGluZ3MpID0+IHtcbiAgICBsZXQgYmluZGluZ3MgPSBbXTtcbiAgICB3aGlsZSAoKG1hdGNoID0gTWFwcGluZ3MuZXhlYyhtYXBwaW5ncykpKSB7XG4gICAgICBjb25zdCBbLCBpZGVudGlmaWVyLCBiaW5kaW5nXSA9IG1hdGNoO1xuICAgICAgYmluZGluZ3MucHVzaChgJHtiaW5kaW5nIHx8ICcoKSd9ID0+ICR7aWRlbnRpZmllcn1gKTtcbiAgICB9XG4gICAgcmV0dXJuIChiaW5kaW5ncy5sZW5ndGggJiYgYGV4cG9ydHMoJHtiaW5kaW5ncy5qb2luKCcsICcpfSlgKSB8fCAnJztcbiAgfSk7XG5cbmNvbnN0IHBhcnNlRnVuY3Rpb24gPSBzb3VyY2UgPT5cbiAgKHR5cGVvZiBzb3VyY2UgPT09ICdmdW5jdGlvbicgJiZcbiAgICAvXlxcKG1vZHVsZSwgZXhwb3J0c1xcKSAqPT4gKnsoW15dKil9JHwvLmV4ZWMoYCR7c291cmNlfWAudHJpbSgpKVsxXSkgfHxcbiAgJyc7XG5cbmV4cG9ydCBjb25zdCBNb2R1bGVFdmFsdWF0b3IgPSAoXG4gIHNvdXJjZSxcbiAgc291cmNlVGV4dCA9ICh0eXBlb2Ygc291cmNlID09PSAnZnVuY3Rpb24nICYmIHBhcnNlRnVuY3Rpb24oc291cmNlKSkgfHwgc291cmNlLFxuKSA9PiBldmFsdWF0ZSh3cmFwKHJld3JpdGUoc291cmNlVGV4dCksIHNvdXJjZVRleHQpKTtcbiIsImltcG9ydCB7Y3JlYXRlLCBmcmVlemUsIHNldFByb3RvdHlwZU9mfSBmcm9tICcuL2hlbHBlcnMubWpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIE1vZHVsZU5hbWVzcGFjZSgpIHt9XG57XG4gIGNvbnN0IHRvUHJpbWl0aXZlID0gc2V0UHJvdG90eXBlT2YoKCkgPT4gJ01vZHVsZU5hbWVzcGFjZScsIG51bGwpO1xuICBjb25zdCB0b1N0cmluZyA9IHNldFByb3RvdHlwZU9mKCgpID0+ICdjbGFzcyBNb2R1bGVOYW1lc3BhY2Uge30nLCBudWxsKTtcbiAgTW9kdWxlTmFtZXNwYWNlLnByb3RvdHlwZSA9IGNyZWF0ZShudWxsLCB7XG4gICAgW1N5bWJvbC50b1ByaW1pdGl2ZV06IHt2YWx1ZTogdG9QcmltaXRpdmUsIGVudW1lcmFibGU6IGZhbHNlfSxcbiAgICBbU3ltYm9sLnRvU3RyaW5nVGFnXToge3ZhbHVlOiAnTW9kdWxlTmFtZXNwYWNlJywgZW51bWVyYWJsZTogZmFsc2V9LFxuICB9KTtcbiAgZnJlZXplKHNldFByb3RvdHlwZU9mKE1vZHVsZU5hbWVzcGFjZSwgY3JlYXRlKG51bGwsIHt0b1N0cmluZzoge3ZhbHVlOiB0b1N0cmluZ319KSkpO1xufVxuIiwiaW1wb3J0IHtNb2R1bGVTY29wZX0gZnJvbSAnLi9zY29wZS5tanMnO1xuaW1wb3J0IHtNb2R1bGVOYW1lc3BhY2V9IGZyb20gJy4vbmFtZXNwYWNlLm1qcyc7XG5pbXBvcnQge0lkZW50aWZpZXIsIE1hcHBpbmdzLCBCaW5kaW5nRGVjbGFyYXRpb25zLCBTcGVjaWZpZXJ9IGZyb20gJy4vZXhwcmVzc2lvbnMubWpzJztcblxuLy8gaW1wb3J0IHtNb2R1bGV9IGZyb20gJy4vbW9kdWxlLm1qcyc7XG5cbmltcG9ydCB7XG4gIG5vb3AsXG4gIGRlZmluZSxcbiAgZGVmaW5lUHJvcGVydHksXG4gIGJpbmQsXG4gIGNvcHksXG4gIGNyZWF0ZSxcbiAgZnJlZXplLFxuICBzZXRQcm90b3R5cGVPZixcbiAgUmVzb2x2ZWRQcm9taXNlLFxufSBmcm9tICcuL2hlbHBlcnMubWpzJztcblxuY29uc3QgRU5VTUVSQUJMRSA9IHRydWU7XG5cbmV4cG9ydCBjb25zdCBNb2R1bGVTdHJhcHBlciA9ICgoKSA9PiB7XG4gIHJldHVybiBjbGFzcyBNb2R1bGVTdHJhcHBlciB7XG4gICAgKnN0cmFwKG1vZHVsZSkge1xuICAgICAgY29uc3QgcmVjb3JkcyA9IG5ldyBXZWFrTWFwKCk7XG4gICAgfVxuXG4gICAgZ2V0IG1hcCgpIHtcbiAgICAgIGlmICh0aGlzICE9PSB0aGlzLmNvbnN0cnVjdG9yLnByb3RvdHlwZSkgcmV0dXJuIGRlZmluZSh0aGlzLCAnbWFwJywgY3JlYXRlKG51bGwpKTtcbiAgICB9XG5cbiAgICBhc3luYyBsaW5rKG1vZHVsZSkge1xuICAgICAgY29uc3QgZW51bWVyYWJsZSA9IHRydWU7XG4gICAgICBjb25zdCB7bmFtZXNwYWNlcywgY29udGV4dCwgYmluZGluZ3MsIGxpbmtzfSA9IG1vZHVsZTtcbiAgICAgIGNvbnN0IHByb21pc2VzID0gW107XG4gICAgICBjb25zdCBpbXBvcnRzID0ge307XG4gICAgICAvLyBjb25zdCBkZXBlbmRlbmNpZXMgPSB7W21vZHVsZS51cmxdOiB0cnVlfTtcblxuICAgICAgLy8gbGV0IGNvbnRleHQ7XG4gICAgICBmb3IgKGNvbnN0IGJpbmRpbmcgaW4gbGlua3MpIHtcbiAgICAgICAgY29uc3QgbGluayA9IGxpbmtzW2JpbmRpbmddO1xuICAgICAgICBjb25zdCB7aW50ZW50LCBzcGVjaWZpZXIsIGlkZW50aWZpZXIsIHVybH0gPSBsaW5rO1xuICAgICAgICBpZiAoIXVybCkgY29udGludWU7XG4gICAgICAgIC8vIGxvZyh7c3BlY2lmaWVyLCBpZGVudGlmaWVyLCB1cmx9KTtcbiAgICAgICAgY29uc3QgbmFtZXNwYWNlID0gbmFtZXNwYWNlc1t1cmxdO1xuICAgICAgICAvLyBjb25zdCBsaW5rZWQgPSBkZXBlbmRlbmNpZXNbdXJsXSB8fCAoZGVwZW5kZW5jaWVzW3VybF0gPSB0aGlzLm1hcFt1cmxdLmxpbmsoKSk7XG4gICAgICAgIGNvbnN0IGltcG9ydGVkID1cbiAgICAgICAgICB1cmwgJiZcbiAgICAgICAgICAoaW1wb3J0c1t1cmxdIHx8XG4gICAgICAgICAgICAoaW1wb3J0c1t1cmxdID0gKG5hbWVzcGFjZSAmJiBSZXNvbHZlZFByb21pc2UpIHx8IG5hbWVzcGFjZXMuaW1wb3J0KHVybCkpKTtcbiAgICAgICAgaWYgKGludGVudCA9PT0gJ2ltcG9ydCcpIHtcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKFxuICAgICAgICAgICAgaW1wb3J0ZWQudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgIGlkZW50aWZpZXIgPT09ICcqJ1xuICAgICAgICAgICAgICAgID8gY29weShiaW5kaW5ncywgbmFtZXNwYWNlcywgdXJsLCBiaW5kaW5nKVxuICAgICAgICAgICAgICAgIDogY29weShiaW5kaW5ncywgbmFtZXNwYWNlc1t1cmxdLCBpZGVudGlmaWVyLCBiaW5kaW5nKTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICk7XG4gICAgICAgICAgYmluZChiaW5kaW5ncywgYmluZGluZywgbm9vcCwgZW51bWVyYWJsZSwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW50ZW50ID09PSAnZXhwb3J0Jykge1xuICAgICAgICAgIHByb21pc2VzLnB1c2goXG4gICAgICAgICAgICBpbXBvcnRlZC50aGVuKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgY29udGV4dC5leHBvcnQuZnJvbShsaW5rKTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICAgIH1cblxuICAgIGluc3RhbnRpYXRlKG1vZHVsZSkge1xuICAgICAgY29uc3QgZW51bWVyYWJsZSA9IGZhbHNlO1xuICAgICAgY29uc3QgbmFtZXNwYWNlID0gbmV3IE1vZHVsZU5hbWVzcGFjZSgpO1xuICAgICAgY29uc3Qge2NvbnRleHQsIGJpbmRpbmdzLCBuYW1lc3BhY2VzLCB1cmx9ID0gbW9kdWxlO1xuXG4gICAgICBjb250ZXh0LmV4cG9ydCA9ICguLi5leHBvcnRzKSA9PiB2b2lkIHRoaXMuYmluZChuYW1lc3BhY2UsIC4uLmV4cG9ydHMpO1xuICAgICAgY29udGV4dC5leHBvcnQuZnJvbSA9ICguLi5saW5rcykgPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IGxpbmsgb2YgbGlua3MpIHtcbiAgICAgICAgICBjb25zdCB7aW50ZW50LCBzcGVjaWZpZXIsIGlkZW50aWZpZXIsIGJpbmRpbmcsIHVybH0gPSBsaW5rO1xuICAgICAgICAgIGlmIChpbnRlbnQgIT09ICdleHBvcnQnKSBjb250aW51ZTtcbiAgICAgICAgICB1cmwgaW4gbmFtZXNwYWNlc1xuICAgICAgICAgICAgPyBjb3B5KG5hbWVzcGFjZSwgbmFtZXNwYWNlc1t1cmxdLCBpZGVudGlmaWVyLCBiaW5kaW5nKVxuICAgICAgICAgICAgOiBiaW5kKG5hbWVzcGFjZSwgYmluZGluZywgKCkgPT4gbmFtZXNwYWNlc1t1cmxdW2lkZW50aWZpZXJdLCBlbnVtZXJhYmxlLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBkZWZpbmVQcm9wZXJ0eShjb250ZXh0LmV4cG9ydCwgJ2RlZmF1bHQnLCB7XG4gICAgICAgIHNldDogdmFsdWUgPT4gdm9pZCB0aGlzLmJpbmQobmFtZXNwYWNlLCB7ZGVmYXVsdDogKCkgPT4gdmFsdWV9KSxcbiAgICAgIH0pO1xuICAgICAgLy8gY29udGV4dC5leHBvcnQuZGVmYXVsdCA9IHZhbHVlID0+IHZvaWQgdGhpcy5iaW5kKG5hbWVzcGFjZSwge2RlZmF1bHQ6ICgpID0+IHZhbHVlfSk7XG5cbiAgICAgIGRlZmluZShiaW5kaW5ncywgJ21vZHVsZScsIGNvbnRleHQsIGZhbHNlLCB0cnVlKTtcbiAgICAgIGRlZmluZShjb250ZXh0LCAnc2NvcGUnLCBzZXRQcm90b3R5cGVPZihiaW5kaW5ncywgTW9kdWxlU2NvcGUpLCBlbnVtZXJhYmxlLCBmYWxzZSk7XG4gICAgICBkZWZpbmUoY29udGV4dCwgJ21ldGEnLCBjcmVhdGUobnVsbCksIGZhbHNlLCBmYWxzZSk7XG4gICAgICBkZWZpbmUoY29udGV4dC5zY29wZSwgJ21ldGEnLCBjb250ZXh0Lm1ldGEsIGZhbHNlLCBmYWxzZSk7XG4gICAgICBkZWZpbmUoY29udGV4dC5tZXRhLCAndXJsJywgdXJsKTtcbiAgICAgIGZyZWV6ZShjb250ZXh0KTtcbiAgICAgIHJldHVybiBkZWZpbmUobW9kdWxlLCAnaW5zdGFuY2UnLCB7bmFtZXNwYWNlLCBjb250ZXh0fSk7XG4gICAgfVxuXG4gICAgYXN5bmMgZXZhbHVhdGUobW9kdWxlKSB7XG4gICAgICBjb25zdCB7YmluZGluZ3MsIG5hbWVzcGFjZSwgY29udGV4dH0gPSBhd2FpdCBtb2R1bGUuaW5zdGFudGlhdGUoKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IG1vZHVsZS5ldmFsdWF0b3IoY29udGV4dCwgY29udGV4dC5leHBvcnQpO1xuICAgICAgICByZXR1cm4gZGVmaW5lKG1vZHVsZSwgJ25hbWVzcGFjZScsIG5hbWVzcGFjZSk7XG4gICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgICAgY29uc29sZS53YXJuKGV4Y2VwdGlvbik7XG4gICAgICAgIGRlZmluZShtb2R1bGUsICdleGNlcHRpb24nLCBleGNlcHRpb24pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGltcG9ydCh1cmwpIHtcbiAgICAgIGNvbnN0IG1vZHVsZSA9IHRoaXMubWFwW3VybF07XG4gICAgICByZXR1cm4gbW9kdWxlLm5hbWVzcGFjZSB8fCAoYXdhaXQgbW9kdWxlLmV2YWx1YXRlKCkpO1xuICAgIH1cblxuICAgIHJlc29sdmUoc3BlY2lmaWVyLCByZWZlcnJlcikge1xuICAgICAgc3BlY2lmaWVyID0gYCR7KHNwZWNpZmllciAmJiBzcGVjaWZpZXIpIHx8ICcnfWA7XG4gICAgICByZWZlcnJlciA9IGAkeyhyZWZlcnJlciAmJiByZWZlcnJlcikgfHwgJyd9YCB8fCAnJztcbiAgICAgIGNvbnN0IGtleSA9IGBbJHtyZWZlcnJlcn1dWyR7c3BlY2lmaWVyfV1gO1xuICAgICAgY29uc3QgY2FjaGUgPSB0aGlzLnJlc29sdmUuY2FjaGUgfHwgKHRoaXMucmVzb2x2ZS5jYWNoZSA9IHt9KTtcbiAgICAgIGxldCB1cmwgPSBjYWNoZVtrZXldO1xuICAgICAgaWYgKHVybCkgcmV0dXJuIHVybC5saW5rO1xuICAgICAgY29uc3Qge3NjaGVtYSwgZG9tYWlufSA9IFNwZWNpZmllci5wYXJzZShzcGVjaWZpZXIpO1xuICAgICAgY29uc3Qgb3JpZ2luID0gKHNjaGVtYSAmJiBgJHtzY2hlbWF9JHtkb21haW4gfHwgJy8vJ31gKSB8fCBgZmlsZTovLy9gO1xuICAgICAgcmVmZXJyZXIgPVxuICAgICAgICAoIXJlZmVycmVyICYmIG9yaWdpbikgfHxcbiAgICAgICAgKGNhY2hlW2BbJHtyZWZlcnJlcn1dYF0gfHwgKGNhY2hlW2BbJHtyZWZlcnJlcn1dYF0gPSBuZXcgVVJMKHJlZmVycmVyLCBvcmlnaW4pKSkuaHJlZjtcbiAgICAgIHVybCA9IGNhY2hlW2tleV0gPSBuZXcgVVJMKHNwZWNpZmllciwgcmVmZXJyZXIpO1xuICAgICAgLy8gbG9nKHtzcGVjaWZpZXIsIHJlZmVycmVyLCBvcmlnaW4sIHNjaGVtYSwgZG9tYWluLCB1cmw6IHVybC5ocmVmfSk7XG4gICAgICByZXR1cm4gKHVybC5saW5rID0gdXJsLmhyZWYucmVwbGFjZSgvXmZpbGU6XFwvXFwvXFwvLywgJycpKTtcbiAgICB9XG5cbiAgICBsaW5rcyhzb3VyY2UsIHJlZmVycmVyKSB7XG4gICAgICAvLyBsb2coe2RlY2xhcmF0aW9uc30pO1xuICAgICAgbGV0IG1hdGNoO1xuICAgICAgY29uc3QgbGlua3MgPSB7fTtcbiAgICAgIHdoaWxlICgobWF0Y2ggPSBCaW5kaW5nRGVjbGFyYXRpb25zLmV4ZWMoc291cmNlKSkpIHtcbiAgICAgICAgLy8gbG9nKG1hdGNoWzBdKTtcbiAgICAgICAgY29uc3QgW2RlY2xhcmF0aW9uLCBpbnRlbnQsIGJpbmRpbmdzLCBiaW5kaW5nLCAsIHNwZWNpZmllcl0gPSBtYXRjaDtcbiAgICAgICAgY29uc3QgbWFwcGluZ3MgPSAoXG4gICAgICAgICAgKGJpbmRpbmcgJiYgKChiaW5kaW5nLnN0YXJ0c1dpdGgoJyogJykgJiYgYmluZGluZykgfHwgYGRlZmF1bHQgYXMgJHtiaW5kaW5nfWApKSB8fFxuICAgICAgICAgIGJpbmRpbmdzIHx8XG4gICAgICAgICAgJydcbiAgICAgICAgKS5zcGxpdCgvICosICovZyk7XG4gICAgICAgIGNvbnN0IHVybCA9IChzcGVjaWZpZXIgJiYgdGhpcy5yZXNvbHZlKHNwZWNpZmllciwgcmVmZXJyZXIpKSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIC8vIGxvZyh7ZGVjbGFyYXRpb24sIGJpbmRpbmdzLCBiaW5kaW5nLCBzcGVjaWZpZXIsIG1hcHBpbmdzfSk7XG4gICAgICAgIHdoaWxlICgobWF0Y2ggPSBNYXBwaW5ncy5leGVjKG1hcHBpbmdzKSkpIHtcbiAgICAgICAgICBjb25zdCBbLCBpZGVudGlmaWVyLCBiaW5kaW5nID0gaWRlbnRpZmllcl0gPSBtYXRjaDtcbiAgICAgICAgICBsaW5rc1tiaW5kaW5nXSA9IHtpbnRlbnQsIHNwZWNpZmllciwgaWRlbnRpZmllciwgYmluZGluZywgdXJsfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGxpbmtzO1xuICAgIH1cblxuICAgIGJpbmQobmFtZXNwYWNlLCAuLi5iaW5kaW5ncykge1xuICAgICAgY29uc3QgZGVzY3JpcHRvcnMgPSB7fTtcbiAgICAgIGZvciAoY29uc3QgYmluZGluZyBvZiBiaW5kaW5ncykge1xuICAgICAgICBjb25zdCB0eXBlID0gdHlwZW9mIGJpbmRpbmc7XG4gICAgICAgIGlmICh0eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgY29uc3QgaWRlbnRpZmllciA9IChJZGVudGlmaWVyLmV4ZWMoYmluZGluZykgfHwgJycpWzBdO1xuICAgICAgICAgIGlkZW50aWZpZXIgJiYgYmluZChuYW1lc3BhY2UsIGlkZW50aWZpZXIsIGJpbmRpbmcsIHRydWUpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBpZGVudGlmaWVyIGluIGJpbmRpbmcpIHtcbiAgICAgICAgICAgIGlkZW50aWZpZXIgPT09IChJZGVudGlmaWVyLmV4ZWMoaWRlbnRpZmllcikgfHwgJycpWzBdICYmXG4gICAgICAgICAgICAgIGJpbmQobmFtZXNwYWNlLCBpZGVudGlmaWVyLCBiaW5kaW5nW2lkZW50aWZpZXJdLCB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG59KSgpO1xuIiwiaW1wb3J0IHtNb2R1bGVOYW1lc3BhY2VzfSBmcm9tICcuL25hbWVzcGFjZXMubWpzJztcbmltcG9ydCB7TW9kdWxlRXZhbHVhdG9yfSBmcm9tICcuL2V2YWx1YXRvci5tanMnO1xuaW1wb3J0IHtNb2R1bGVTdHJhcHBlcn0gZnJvbSAnLi9zdHJhcHBlci5tanMnO1xuaW1wb3J0IHtjcmVhdGUsIGRlZmluZSwgZnJlZXplLCBzZXRQcm90b3R5cGVPZn0gZnJvbSAnLi9oZWxwZXJzLm1qcyc7XG5cbmV4cG9ydCBjbGFzcyBNb2R1bGUge1xuICBjb25zdHJ1Y3Rvcih1cmwsIGV2YWx1YXRvciwgaW1wb3J0cykge1xuICAgIGNvbnN0IGVudW1lcmFibGUgPSBmYWxzZTtcbiAgICBkZWZpbmUodGhpcywgJ3VybCcsIHVybCwgZW51bWVyYWJsZSk7XG4gICAgZGVmaW5lKHRoaXMsICdldmFsdWF0b3InLCBNb2R1bGVFdmFsdWF0b3IoZXZhbHVhdG9yKSwgZW51bWVyYWJsZSk7XG4gICAgZGVmaW5lKHRoaXMsICdjb250ZXh0JywgY3JlYXRlKG51bGwsIGNvbnRleHR1YWxzKSwgZW51bWVyYWJsZSwgZmFsc2UpO1xuICAgIGRlZmluZSh0aGlzLCAnYmluZGluZ3MnLCBjcmVhdGUobnVsbCksIGVudW1lcmFibGUpO1xuICAgIGRlZmluZSh0aGlzLCAnbGlua3MnLCBNb2R1bGUubGlua3MoaW1wb3J0cyB8fCBgJHtldmFsdWF0b3J9YCwgdXJsKSwgZW51bWVyYWJsZSwgZmFsc2UpO1xuICAgIHRoaXMubmFtZXNwYWNlcyB8fCBkZWZpbmUobmV3LnRhcmdldC5wcm90b3R5cGUsICduYW1lc3BhY2VzJywgbmV3IE1vZHVsZU5hbWVzcGFjZXMoKSwgZmFsc2UpO1xuICAgIE1vZHVsZS5tYXBbdXJsXSA9IHRoaXM7XG4gIH1cblxuICBsaW5rKCkge1xuICAgIGNvbnN0IHByb21pc2UgPSBNb2R1bGUubGluayh0aGlzKTtcbiAgICBkZWZpbmUodGhpcywgJ2xpbmsnLCAoKSA9PiBwcm9taXNlKTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbiAgfVxuXG4gIGluc3RhbnRpYXRlKCkge1xuICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZSB8fCBNb2R1bGUuaW5zdGFudGlhdGUodGhpcyk7XG4gICAgY29uc3QgcHJvbWlzZSA9IHRoaXMubGluaygpLnRoZW4oKCkgPT4gaW5zdGFuY2UpO1xuICAgIGRlZmluZSh0aGlzLCAnaW5zdGFudGlhdGUnLCAoKSA9PiBwcm9taXNlKTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbiAgfVxuXG4gIGV2YWx1YXRlKCkge1xuICAgIGNvbnN0IHByb21pc2UgPSBNb2R1bGUuZXZhbHVhdGUodGhpcykudGhlbigoKSA9PiB0aGlzLm5hbWVzcGFjZSk7XG4gICAgZGVmaW5lKHRoaXMsICdldmFsdWF0ZScsICgpID0+IHByb21pc2UpO1xuICAgIHJldHVybiBwcm9taXNlO1xuICB9XG59XG5cbi8qKiBQcm9wZXJ0aWVzIGluamVjdGVkIGludG8gZXZlcnkgbW9kdWxlIGNvbnRleHQgKi9cbmNvbnN0IGNvbnRleHR1YWxzID0ge307XG5cbk1vZHVsZS5kZWJ1Z2dpbmcgPSAoKCkgPT4ge1xuICBjb25zdCBkZWJ1ZyA9ICh0eXBlLCAuLi5hcmdzKSA9PiB7XG4gICAgY29uc29sZS5sb2codHlwZSwgLi4uYXJncyk7XG4gICAgLy8gdHlwZSBpbiBkZWJ1Z2dpbmcgJiYgZGVidWdnaW5nW3R5cGVdIG51bGwsIGFyZ3MpO1xuICB9O1xuICBjb25zdCBkZWJ1Z2dpbmcgPSAoZGVidWcuZGVidWdnaW5nID0ge30pO1xuICBjb250ZXh0dWFscy5kZWJ1ZyA9IHt2YWx1ZTogZnJlZXplKGRlYnVnKX07XG4gIHJldHVybiBkZWJ1Z2dpbmc7XG59KSgpO1xuXG5zZXRQcm90b3R5cGVPZihNb2R1bGUsIG5ldyBNb2R1bGVTdHJhcHBlcigpKTtcbiIsImltcG9ydCB7ZnJlZXplLCBzZXRQcm90b3R5cGVPZn0gZnJvbSAnLi9oZWxwZXJzLm1qcyc7XG5pbXBvcnQge01vZHVsZX0gZnJvbSAnLi9tb2R1bGUubWpzJztcblxuZXhwb3J0IGNvbnN0IEdsb2JhbFNjb3BlID1cbiAgKHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyAmJiBzZWxmICYmIHNlbGYuc2VsZikgfHxcbiAgKHR5cGVvZiBnbG9iYWwgPT09ICdvYmplY3QnICYmIGdsb2JhbCAmJiBnbG9iYWwuZ2xvYmFsKSB8fFxuICAoKCkgPT4gKDEsIGV2YWwpKCd0aGlzJykpKCk7XG5cbmNvbnN0IGdsb2JhbHMgPSAoKHtldmFsOiAkZXZhbH0pID0+ICh7XG4gIGV2YWw6ICRldmFsLFxuICBNb2R1bGUsXG59KSkoR2xvYmFsU2NvcGUpO1xuXG5jb25zdCBzY29wZSA9IGZyZWV6ZShzZXRQcm90b3R5cGVPZih7Li4uZ2xvYmFsc30sIEdsb2JhbFNjb3BlKSk7XG5cbmNvbnN0IGxvY2FscyA9IHt9O1xuXG5leHBvcnQgY29uc3QgTW9kdWxlU2NvcGUgPSBuZXcgUHJveHkoc2NvcGUsIHtcbiAgZ2V0OiAodGFyZ2V0LCBwcm9wZXJ0eSwgcmVjZWl2ZXIpID0+IHtcbiAgICBpZiAocHJvcGVydHkgaW4gZ2xvYmFscykgcmV0dXJuIGdsb2JhbHNbcHJvcGVydHldO1xuICAgIGNvbnN0IHZhbHVlID1cbiAgICAgIHByb3BlcnR5IGluIEdsb2JhbFNjb3BlICYmIHR5cGVvZiBwcm9wZXJ0eSA9PT0gJ3N0cmluZycgPyBHbG9iYWxTY29wZVtwcm9wZXJ0eV0gOiB1bmRlZmluZWQ7XG4gICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29uc3QgbG9jYWwgPSBsb2NhbHNbcHJvcGVydHldO1xuICAgICAgY29uc3Qge3Byb3h5fSA9XG4gICAgICAgIChsb2NhbCAmJiBsb2NhbC52YWx1ZSA9PT0gdmFsdWUgJiYgbG9jYWwpIHx8XG4gICAgICAgIChsb2NhbHNbcHJvcGVydHldID0ge1xuICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgIHByb3h5OiBuZXcgUHJveHkodmFsdWUsIHtcbiAgICAgICAgICAgIGNvbnN0cnVjdDogKGNvbnN0cnVjdG9yLCBhcmdBcnJheSwgbmV3VGFyZ2V0KSA9PlxuICAgICAgICAgICAgICBSZWZsZWN0LmNvbnN0cnVjdCh2YWx1ZSwgYXJnQXJyYXksIG5ld1RhcmdldCksXG4gICAgICAgICAgICBhcHBseTogKG1ldGhvZCwgdGhpc0FyZywgYXJnQXJyYXkpID0+XG4gICAgICAgICAgICAgIHRoaXNBcmcgPT0gbnVsbCB8fCB0aGlzQXJnID09PSByZWNlaXZlclxuICAgICAgICAgICAgICAgID8gdmFsdWUoLi4uYXJnQXJyYXkpXG4gICAgICAgICAgICAgICAgOiBSZWZsZWN0LmFwcGx5KHZhbHVlLCB0aGlzQXJnLCBhcmdBcnJheSksXG4gICAgICAgICAgfSksXG4gICAgICAgIH0pO1xuICAgICAgcmV0dXJuIHByb3h5O1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG4gIH0sXG4gIHNldDogKGdsb2JhbHMsIHByb3BlcnR5KSA9PiB7XG4gICAgdGhyb3cgUmVmZXJlbmNlRXJyb3IoYCR7cHJvcGVydHl9IGlzIG5vdCBkZWZpbmVkYCk7XG4gIH0sXG59KTtcbiIsImltcG9ydCB7TW9kdWxlU2NvcGUsIEdsb2JhbFNjb3BlfSBmcm9tICcuL3Njb3BlLm1qcyc7XG5cbkdsb2JhbFNjb3BlLk1vZHVsZVNjb3BlID0gTW9kdWxlU2NvcGU7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQU8sTUFBTSxDQUFDLGNBQWMsRUFBRSx3QkFBd0IsQ0FBQyxHQUFHLE9BQU8sQ0FBQztBQUNsRSxBQUFPLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxHQUFHLE1BQU0sQ0FBQzs7QUFFdkQsQUFBTyxNQUFNLElBQUksR0FBRyxNQUFNLEVBQUUsQ0FBQzs7QUFFN0IsQUFBTyxNQUFNLE1BQU0sR0FBRyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFVBQVUsR0FBRyxLQUFLLEVBQUUsWUFBWSxHQUFHLEtBQUs7RUFDdEYsY0FBYyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDOztBQUUvRSxBQUFPLE1BQU0sSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsVUFB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
