(function () {
  'use strict';

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

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlcy5qcyIsInNvdXJjZXMiOlsiLi4vbGliL2hlbHBlcnMubWpzIiwiLi4vbGliL25hbWVzcGFjZXMubWpzIiwiLi4vbGliL2V4cHJlc3Npb25zLm1qcyIsIi4uL2xpYi9ldmFsdWF0b3IubWpzIiwiLi4vbGliL25hbWVzcGFjZS5tanMiLCIuLi9saWIvc3RyYXBwZXIubWpzIiwiLi4vbGliL21vZHVsZS5tanMiLCIuLi9saWIvc2NvcGUubWpzIiwiLi4vbGliL21vZHVsZXMubWpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCB7ZGVmaW5lUHJvcGVydHksIGdldE93blByb3BlcnR5RGVzY3JpcHRvcn0gPSBSZWZsZWN0O1xuZXhwb3J0IGNvbnN0IHtjcmVhdGUsIGZyZWV6ZSwgc2V0UHJvdG90eXBlT2Z9ID0gT2JqZWN0O1xuXG5leHBvcnQgY29uc3Qgbm9vcCA9ICgpID0+IHt9O1xuXG5leHBvcnQgY29uc3QgZGVmaW5lID0gKHRhcmdldCwgcHJvcGVydHksIHZhbHVlLCBlbnVtZXJhYmxlID0gZmFsc2UsIGNvbmZpZ3VyYWJsZSA9IGZhbHNlKSA9PlxuICBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHByb3BlcnR5LCB7dmFsdWUsIGVudW1lcmFibGUsIGNvbmZpZ3VyYWJsZX0pICYmIHZhbHVlO1xuXG5leHBvcnQgY29uc3QgYmluZCA9ICh0YXJnZXQsIHByb3BlcnR5LCBnZXQsIGVudW1lcmFibGUgPSBmYWxzZSwgY29uZmlndXJhYmxlID0gZmFsc2UpID0+XG4gIGRlZmluZVByb3BlcnR5KHRhcmdldCwgcHJvcGVydHksIHtnZXQsIHNldDogbm9vcCwgY29uZmlndXJhYmxlLCBlbnVtZXJhYmxlfSk7XG5cbmV4cG9ydCBjb25zdCBjb3B5ID0gKHRhcmdldCwgc291cmNlLCBpZGVudGlmaWVyLCBhbGlhcyA9IGlkZW50aWZpZXIpID0+XG4gIGRlZmluZVByb3BlcnR5KHRhcmdldCwgYWxpYXMsIGdldE93blByb3BlcnR5RGVzY3JpcHRvcihzb3VyY2UsIGlkZW50aWZpZXIpKTtcblxuZXhwb3J0IGNvbnN0IFJlc29sdmVkUHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuIiwiaW1wb3J0IHtNb2R1bGV9IGZyb20gJy4vbW9kdWxlLm1qcyc7XG5pbXBvcnQge2RlZmluZSwgYmluZH0gZnJvbSAnLi9oZWxwZXJzLm1qcyc7XG5cbmV4cG9ydCBjbGFzcyBNb2R1bGVOYW1lc3BhY2VzIHtcbiAgaW1wb3J0KHVybCkge1xuICAgIHJldHVybiAoXG4gICAgICB0aGlzW3VybF0gfHxcbiAgICAgIGRlZmluZSh0aGlzLCB1cmwsIE1vZHVsZS5pbXBvcnQodXJsKS50aGVuKFxuICAgICAgICBuYW1lc3BhY2UgPT4gKGJpbmQodGhpcywgdXJsLCAoKSA9PiBuYW1lc3BhY2UsIHRydWUsIGZhbHNlKSwgbmFtZXNwYWNlKSxcbiAgICAgICksIHRydWUsIHRydWUpXG4gICAgKTtcbiAgfVxufVxuIiwiLy8vIEVDTUFTY3JpcHQgRXhwcmVzc2lvbnNcblxuLyoqIEVDTUFTY3JpcHQgcXVvdGVkIHN0cmluZ3M6IGAn4oCmJ2Agb3IgYFwi4oCmXCJgICAqL1xuZXhwb3J0IGNvbnN0IFN0cmluZ0xpdGVyYWwgPSAvXCIoPzpbXlxcXFxcIl0rfFxcXFwuKSooPzpcInwkKXwnKD86W15cXFxcJ10rfFxcXFwuKSooPzonfCQpL2c7XG5cbi8qKiBFQ01BU2NyaXB0IGNvbW1lbnRzICovXG5leHBvcnQgY29uc3QgQ29tbWVudHMgPSAvXFwvXFwvLiooPzpcXG58JCl8XFwvXFwqW15dKj8oPzpcXCpcXC98JCl8XlxcI1xcIS4qXFxuL2c7XG5cbi8qKiBFQ01BU2NyaXB0IHJlZ3VsYXIgZXhwcmVzc2lvbnMgICovXG5leHBvcnQgY29uc3QgUmVnRXhwcyA9IC9cXC8oPz1bXlxcKlxcL1xcbl1bXlxcbl0qXFwvKSg/OlteXFxcXFxcL1xcblxcdFxcW10rfFxcXFxcXFN8XFxbKD86XFxcXFxcU3xbXlxcXFxcXG5cXHRcXF1dKykrP1xcXSkrP1xcL1thLXpdKi9nO1xuXG4vLy8gQ3VzdG9tIEV4cHJlc3Npb25zXG5cbi8qKiBDb21tYSB3aXRoIHN1cnJvdW5kaW5nIHdoaXRlc3BhY2UgKi9cbmV4cG9ydCBjb25zdCBTZXBhcmF0b3IgPSAvW1xcc1xcbl0qLFtcXHNcXG5dKi87XG5cbi8qKiBNYXBwZWQgYmluZGluZzogYElkZW50aWZpZXIgYXMgQmluZGluZ0lkZW50aWZpZXJgICovXG5leHBvcnQgY29uc3QgTWFwcGluZ3MgPSAvKFteXFxzLF0rKSg/OiArYXMgKyhbXlxccyxdKykpPy9nO1xuXG4vKiogUXVvdGVkIGV4cG9ydCBtYXBwaW5nczogYGV4cG9ydCB74oCmfWAgKi9cbmV4cG9ydCBjb25zdCBFeHBvcnRzID0gL2BleHBvcnQgKnsoW159YDtcXCpdKil9YC9nbTtcblxuLyoqIE5vdGhpbmcgYnV0IElkZW50aWZpZXIgQ2hhcmFjdGVycyAqL1xuZXhwb3J0IGNvbnN0IElkZW50aWZpZXIgPSAvW15cXG5cXHNcXChcXClcXHtcXH1cXC09KyovJWBcIid+ISYuOl48PixdKy87XG5cbmV4cG9ydCBjb25zdCBCaW5kaW5ncyA9IC9cXGIoaW1wb3J0fGV4cG9ydClcXGIgKyg/OnsgKihbXn1dKj8pICp9fChbKl0gK2FzICtcXFMrfFxcUyspfCkoPzogK2Zyb21cXGJ8KSg/OiArKFsnXCJdKSguKj8pXFw0fCg/OmNvbnN0fGxldHx2YXIpICsoPzp7ICooW159XSo/KSAqfXxcXFMrKXwpL2c7XG5cbmV4cG9ydCBjb25zdCBCaW5kaW5nRGVjbGFyYXRpb25zID0gL1xcYihpbXBvcnR8ZXhwb3J0KVxcYiArKD86eyAqKFtefV0qPykgKn18KFsqXSArYXMgK1xcUyt8XFxTKyl8KSg/OiArZnJvbVxcYnwpKD86ICsoWydcIl0pKC4qPylcXDR8KS9nO1xuXG5leHBvcnQgY29uc3QgU3BlY2lmaWVyID0gL14oPzooW2Etel0rW14vXSo/OilcXC97MCwyfShcXGJbXi9dK1xcLz8pPykoXFwuezAsMn1cXC8pPyhbXiM/XSo/KShcXD9bXiNdKj8pPygjLio/KT8kL3U7XG5cblNwZWNpZmllci5wYXJzZSA9IHNwZWNpZmllciA9PiB7XG4gIGNvbnN0IFt1cmwsIHNjaGVtYSwgZG9tYWluLCByb290LCBwYXRoLCBxdWVyeSwgZnJhZ21lbnRdID0gU3BlY2lmaWVyLmV4ZWMoc3BlY2lmaWVyKSB8fCAnJztcbiAgcmV0dXJuIHt1cmwsIHNjaGVtYSwgZG9tYWluLCByb290LCBwYXRoLCBxdWVyeSwgZnJhZ21lbnQsIHNwZWNpZmllcn07XG59O1xuIiwiaW1wb3J0IHtFeHBvcnRzLCBNYXBwaW5nc30gZnJvbSAnLi9leHByZXNzaW9ucy5tanMnO1xuXG5jb25zdCBldmFsdWF0ZSA9IGNvZGUgPT4gKDEsIGV2YWwpKGNvZGUpO1xuXG5jb25zdCB3cmFwID0gKGJvZHksIHNvdXJjZSkgPT4gYFxuKChtb2R1bGUsIGV4cG9ydHMpID0+IHtcbiAgbW9kdWxlLmRlYnVnKCdtb2R1bGUtdXJsJywgbW9kdWxlLm1ldGEudXJsKTtcbiAgbW9kdWxlLmRlYnVnKCdib2R5LXRleHQnLCAke0pTT04uc3RyaW5naWZ5KGJvZHkpfSk7XG4gIG1vZHVsZS5kZWJ1Zygnc291cmNlLXRleHQnLCAke0pTT04uc3RyaW5naWZ5KHNvdXJjZSl9KTtcbiAgd2l0aChtb2R1bGUuc2NvcGUpIChmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgJHtib2R5fVxuICB9KSgpO1xufSlcbmA7XG5cbmNvbnN0IHJld3JpdGUgPSBzb3VyY2UgPT5cbiAgc291cmNlLnJlcGxhY2UoRXhwb3J0cywgKG1hdGNoLCBtYXBwaW5ncykgPT4ge1xuICAgIGxldCBiaW5kaW5ncyA9IFtdO1xuICAgIHdoaWxlICgobWF0Y2ggPSBNYXBwaW5ncy5leGVjKG1hcHBpbmdzKSkpIHtcbiAgICAgIGNvbnN0IFssIGlkZW50aWZpZXIsIGJpbmRpbmddID0gbWF0Y2g7XG4gICAgICBiaW5kaW5ncy5wdXNoKGAke2JpbmRpbmcgfHwgJygpJ30gPT4gJHtpZGVudGlmaWVyfWApO1xuICAgIH1cbiAgICByZXR1cm4gKGJpbmRpbmdzLmxlbmd0aCAmJiBgZXhwb3J0cygke2JpbmRpbmdzLmpvaW4oJywgJyl9KWApIHx8ICcnO1xuICB9KTtcblxuY29uc3QgcGFyc2VGdW5jdGlvbiA9IHNvdXJjZSA9PlxuICAodHlwZW9mIHNvdXJjZSA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgIC9eXFwobW9kdWxlLCBleHBvcnRzXFwpICo9PiAqeyhbXl0qKX0kfC8uZXhlYyhgJHtzb3VyY2V9YC50cmltKCkpWzFdKSB8fFxuICAnJztcblxuZXhwb3J0IGNvbnN0IE1vZHVsZUV2YWx1YXRvciA9IChcbiAgc291cmNlLFxuICBzb3VyY2VUZXh0ID0gKHR5cGVvZiBzb3VyY2UgPT09ICdmdW5jdGlvbicgJiYgcGFyc2VGdW5jdGlvbihzb3VyY2UpKSB8fCBzb3VyY2UsXG4pID0+IGV2YWx1YXRlKHdyYXAocmV3cml0ZShzb3VyY2VUZXh0KSwgc291cmNlVGV4dCkpO1xuIiwiaW1wb3J0IHtjcmVhdGUsIGZyZWV6ZSwgc2V0UHJvdG90eXBlT2Z9IGZyb20gJy4vaGVscGVycy5tanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gTW9kdWxlTmFtZXNwYWNlKCkge31cbntcbiAgY29uc3QgdG9QcmltaXRpdmUgPSBzZXRQcm90b3R5cGVPZigoKSA9PiAnTW9kdWxlTmFtZXNwYWNlJywgbnVsbCk7XG4gIGNvbnN0IHRvU3RyaW5nID0gc2V0UHJvdG90eXBlT2YoKCkgPT4gJ2NsYXNzIE1vZHVsZU5hbWVzcGFjZSB7fScsIG51bGwpO1xuICBNb2R1bGVOYW1lc3BhY2UucHJvdG90eXBlID0gY3JlYXRlKG51bGwsIHtcbiAgICBbU3ltYm9sLnRvUHJpbWl0aXZlXToge3ZhbHVlOiB0b1ByaW1pdGl2ZSwgZW51bWVyYWJsZTogZmFsc2V9LFxuICAgIFtTeW1ib2wudG9TdHJpbmdUYWddOiB7dmFsdWU6ICdNb2R1bGVOYW1lc3BhY2UnLCBlbnVtZXJhYmxlOiBmYWxzZX0sXG4gIH0pO1xuICBmcmVlemUoc2V0UHJvdG90eXBlT2YoTW9kdWxlTmFtZXNwYWNlLCBjcmVhdGUobnVsbCwge3RvU3RyaW5nOiB7dmFsdWU6IHRvU3RyaW5nfX0pKSk7XG59XG4iLCJpbXBvcnQge01vZHVsZVNjb3BlfSBmcm9tICcuL3Njb3BlLm1qcyc7XG5pbXBvcnQge01vZHVsZU5hbWVzcGFjZX0gZnJvbSAnLi9uYW1lc3BhY2UubWpzJztcbmltcG9ydCB7SWRlbnRpZmllciwgTWFwcGluZ3MsIEJpbmRpbmdEZWNsYXJhdGlvbnMsIFNwZWNpZmllcn0gZnJvbSAnLi9leHByZXNzaW9ucy5tanMnO1xuXG4vLyBpbXBvcnQge01vZHVsZX0gZnJvbSAnLi9tb2R1bGUubWpzJztcblxuaW1wb3J0IHtcbiAgbm9vcCxcbiAgZGVmaW5lLFxuICBkZWZpbmVQcm9wZXJ0eSxcbiAgYmluZCxcbiAgY29weSxcbiAgY3JlYXRlLFxuICBmcmVlemUsXG4gIHNldFByb3RvdHlwZU9mLFxuICBSZXNvbHZlZFByb21pc2UsXG59IGZyb20gJy4vaGVscGVycy5tanMnO1xuXG5jb25zdCBFTlVNRVJBQkxFID0gdHJ1ZTtcblxuZXhwb3J0IGNvbnN0IE1vZHVsZVN0cmFwcGVyID0gKCgpID0+IHtcbiAgcmV0dXJuIGNsYXNzIE1vZHVsZVN0cmFwcGVyIHtcbiAgICAqc3RyYXAobW9kdWxlKSB7XG4gICAgICBjb25zdCByZWNvcmRzID0gbmV3IFdlYWtNYXAoKTtcbiAgICB9XG5cbiAgICBnZXQgbWFwKCkge1xuICAgICAgaWYgKHRoaXMgIT09IHRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlKSByZXR1cm4gZGVmaW5lKHRoaXMsICdtYXAnLCBjcmVhdGUobnVsbCkpO1xuICAgIH1cblxuICAgIGFzeW5jIGxpbmsobW9kdWxlKSB7XG4gICAgICBjb25zdCBlbnVtZXJhYmxlID0gdHJ1ZTtcbiAgICAgIGNvbnN0IHtuYW1lc3BhY2VzLCBjb250ZXh0LCBiaW5kaW5ncywgbGlua3N9ID0gbW9kdWxlO1xuICAgICAgY29uc3QgcHJvbWlzZXMgPSBbXTtcbiAgICAgIGNvbnN0IGltcG9ydHMgPSB7fTtcbiAgICAgIC8vIGNvbnN0IGRlcGVuZGVuY2llcyA9IHtbbW9kdWxlLnVybF06IHRydWV9O1xuXG4gICAgICAvLyBsZXQgY29udGV4dDtcbiAgICAgIGZvciAoY29uc3QgYmluZGluZyBpbiBsaW5rcykge1xuICAgICAgICBjb25zdCBsaW5rID0gbGlua3NbYmluZGluZ107XG4gICAgICAgIGNvbnN0IHtpbnRlbnQsIHNwZWNpZmllciwgaWRlbnRpZmllciwgdXJsfSA9IGxpbms7XG4gICAgICAgIGlmICghdXJsKSBjb250aW51ZTtcbiAgICAgICAgLy8gbG9nKHtzcGVjaWZpZXIsIGlkZW50aWZpZXIsIHVybH0pO1xuICAgICAgICBjb25zdCBuYW1lc3BhY2UgPSBuYW1lc3BhY2VzW3VybF07XG4gICAgICAgIC8vIGNvbnN0IGxpbmtlZCA9IGRlcGVuZGVuY2llc1t1cmxdIHx8IChkZXBlbmRlbmNpZXNbdXJsXSA9IHRoaXMubWFwW3VybF0ubGluaygpKTtcbiAgICAgICAgY29uc3QgaW1wb3J0ZWQgPVxuICAgICAgICAgIHVybCAmJlxuICAgICAgICAgIChpbXBvcnRzW3VybF0gfHxcbiAgICAgICAgICAgIChpbXBvcnRzW3VybF0gPSAobmFtZXNwYWNlICYmIFJlc29sdmVkUHJvbWlzZSkgfHwgbmFtZXNwYWNlcy5pbXBvcnQodXJsKSkpO1xuICAgICAgICBpZiAoaW50ZW50ID09PSAnaW1wb3J0Jykge1xuICAgICAgICAgIHByb21pc2VzLnB1c2goXG4gICAgICAgICAgICBpbXBvcnRlZC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgaWRlbnRpZmllciA9PT0gJyonXG4gICAgICAgICAgICAgICAgPyBjb3B5KGJpbmRpbmdzLCBuYW1lc3BhY2VzLCB1cmwsIGJpbmRpbmcpXG4gICAgICAgICAgICAgICAgOiBjb3B5KGJpbmRpbmdzLCBuYW1lc3BhY2VzW3VybF0sIGlkZW50aWZpZXIsIGJpbmRpbmcpO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgKTtcbiAgICAgICAgICBiaW5kKGJpbmRpbmdzLCBiaW5kaW5nLCBub29wLCBlbnVtZXJhYmxlLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbnRlbnQgPT09ICdleHBvcnQnKSB7XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChcbiAgICAgICAgICAgIGltcG9ydGVkLnRoZW4oYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICBjb250ZXh0LmV4cG9ydC5mcm9tKGxpbmspO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gICAgfVxuXG4gICAgaW5zdGFudGlhdGUobW9kdWxlKSB7XG4gICAgICBjb25zdCBlbnVtZXJhYmxlID0gZmFsc2U7XG4gICAgICBjb25zdCBuYW1lc3BhY2UgPSBuZXcgTW9kdWxlTmFtZXNwYWNlKCk7XG4gICAgICBjb25zdCB7Y29udGV4dCwgYmluZGluZ3MsIG5hbWVzcGFjZXMsIHVybH0gPSBtb2R1bGU7XG5cbiAgICAgIGNvbnRleHQuZXhwb3J0ID0gKC4uLmV4cG9ydHMpID0+IHZvaWQgdGhpcy5iaW5kKG5hbWVzcGFjZSwgLi4uZXhwb3J0cyk7XG4gICAgICBjb250ZXh0LmV4cG9ydC5mcm9tID0gKC4uLmxpbmtzKSA9PiB7XG4gICAgICAgIGZvciAoY29uc3QgbGluayBvZiBsaW5rcykge1xuICAgICAgICAgIGNvbnN0IHtpbnRlbnQsIHNwZWNpZmllciwgaWRlbnRpZmllciwgYmluZGluZywgdXJsfSA9IGxpbms7XG4gICAgICAgICAgaWYgKGludGVudCAhPT0gJ2V4cG9ydCcpIGNvbnRpbnVlO1xuICAgICAgICAgIHVybCBpbiBuYW1lc3BhY2VzXG4gICAgICAgICAgICA/IGNvcHkobmFtZXNwYWNlLCBuYW1lc3BhY2VzW3VybF0sIGlkZW50aWZpZXIsIGJpbmRpbmcpXG4gICAgICAgICAgICA6IGJpbmQobmFtZXNwYWNlLCBiaW5kaW5nLCAoKSA9PiBuYW1lc3BhY2VzW3VybF1baWRlbnRpZmllcl0sIGVudW1lcmFibGUsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGRlZmluZVByb3BlcnR5KGNvbnRleHQuZXhwb3J0LCAnZGVmYXVsdCcsIHtcbiAgICAgICAgc2V0OiB2YWx1ZSA9PiB2b2lkIHRoaXMuYmluZChuYW1lc3BhY2UsIHtkZWZhdWx0OiAoKSA9PiB2YWx1ZX0pLFxuICAgICAgfSk7XG4gICAgICAvLyBjb250ZXh0LmV4cG9ydC5kZWZhdWx0ID0gdmFsdWUgPT4gdm9pZCB0aGlzLmJpbmQobmFtZXNwYWNlLCB7ZGVmYXVsdDogKCkgPT4gdmFsdWV9KTtcblxuICAgICAgZGVmaW5lKGJpbmRpbmdzLCAnbW9kdWxlJywgY29udGV4dCwgZmFsc2UsIHRydWUpO1xuICAgICAgZGVmaW5lKGNvbnRleHQsICdzY29wZScsIHNldFByb3RvdHlwZU9mKGJpbmRpbmdzLCBNb2R1bGVTY29wZSksIGVudW1lcmFibGUsIGZhbHNlKTtcbiAgICAgIGRlZmluZShjb250ZXh0LCAnbWV0YScsIGNyZWF0ZShudWxsKSwgZmFsc2UsIGZhbHNlKTtcbiAgICAgIGRlZmluZShjb250ZXh0LnNjb3BlLCAnbWV0YScsIGNvbnRleHQubWV0YSwgZmFsc2UsIGZhbHNlKTtcbiAgICAgIGRlZmluZShjb250ZXh0Lm1ldGEsICd1cmwnLCB1cmwpO1xuICAgICAgZnJlZXplKGNvbnRleHQpO1xuICAgICAgcmV0dXJuIGRlZmluZShtb2R1bGUsICdpbnN0YW5jZScsIHtuYW1lc3BhY2UsIGNvbnRleHR9KTtcbiAgICB9XG5cbiAgICBhc3luYyBldmFsdWF0ZShtb2R1bGUpIHtcbiAgICAgIGNvbnN0IHtiaW5kaW5ncywgbmFtZXNwYWNlLCBjb250ZXh0fSA9IGF3YWl0IG1vZHVsZS5pbnN0YW50aWF0ZSgpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgbW9kdWxlLmV2YWx1YXRvcihjb250ZXh0LCBjb250ZXh0LmV4cG9ydCk7XG4gICAgICAgIHJldHVybiBkZWZpbmUobW9kdWxlLCAnbmFtZXNwYWNlJywgbmFtZXNwYWNlKTtcbiAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICBjb25zb2xlLndhcm4oZXhjZXB0aW9uKTtcbiAgICAgICAgZGVmaW5lKG1vZHVsZSwgJ2V4Y2VwdGlvbicsIGV4Y2VwdGlvbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgaW1wb3J0KHVybCkge1xuICAgICAgY29uc3QgbW9kdWxlID0gdGhpcy5tYXBbdXJsXTtcbiAgICAgIHJldHVybiBtb2R1bGUubmFtZXNwYWNlIHx8IChhd2FpdCBtb2R1bGUuZXZhbHVhdGUoKSk7XG4gICAgfVxuXG4gICAgcmVzb2x2ZShzcGVjaWZpZXIsIHJlZmVycmVyKSB7XG4gICAgICBzcGVjaWZpZXIgPSBgJHsoc3BlY2lmaWVyICYmIHNwZWNpZmllcikgfHwgJyd9YDtcbiAgICAgIHJlZmVycmVyID0gYCR7KHJlZmVycmVyICYmIHJlZmVycmVyKSB8fCAnJ31gIHx8ICcnO1xuICAgICAgY29uc3Qga2V5ID0gYFske3JlZmVycmVyfV1bJHtzcGVjaWZpZXJ9XWA7XG4gICAgICBjb25zdCBjYWNoZSA9IHRoaXMucmVzb2x2ZS5jYWNoZSB8fCAodGhpcy5yZXNvbHZlLmNhY2hlID0ge30pO1xuICAgICAgbGV0IHVybCA9IGNhY2hlW2tleV07XG4gICAgICBpZiAodXJsKSByZXR1cm4gdXJsLmxpbms7XG4gICAgICBjb25zdCB7c2NoZW1hLCBkb21haW59ID0gU3BlY2lmaWVyLnBhcnNlKHNwZWNpZmllcik7XG4gICAgICBjb25zdCBvcmlnaW4gPSAoc2NoZW1hICYmIGAke3NjaGVtYX0ke2RvbWFpbiB8fCAnLy8nfWApIHx8IGBmaWxlOi8vL2A7XG4gICAgICByZWZlcnJlciA9XG4gICAgICAgICghcmVmZXJyZXIgJiYgb3JpZ2luKSB8fFxuICAgICAgICAoY2FjaGVbYFske3JlZmVycmVyfV1gXSB8fCAoY2FjaGVbYFske3JlZmVycmVyfV1gXSA9IG5ldyBVUkwocmVmZXJyZXIsIG9yaWdpbikpKS5ocmVmO1xuICAgICAgdXJsID0gY2FjaGVba2V5XSA9IG5ldyBVUkwoc3BlY2lmaWVyLCByZWZlcnJlcik7XG4gICAgICAvLyBsb2coe3NwZWNpZmllciwgcmVmZXJyZXIsIG9yaWdpbiwgc2NoZW1hLCBkb21haW4sIHVybDogdXJsLmhyZWZ9KTtcbiAgICAgIHJldHVybiAodXJsLmxpbmsgPSB1cmwuaHJlZi5yZXBsYWNlKC9eZmlsZTpcXC9cXC9cXC8vLCAnJykpO1xuICAgIH1cblxuICAgIGxpbmtzKHNvdXJjZSwgcmVmZXJyZXIpIHtcbiAgICAgIC8vIGxvZyh7ZGVjbGFyYXRpb25zfSk7XG4gICAgICBsZXQgbWF0Y2g7XG4gICAgICBjb25zdCBsaW5rcyA9IHt9O1xuICAgICAgd2hpbGUgKChtYXRjaCA9IEJpbmRpbmdEZWNsYXJhdGlvbnMuZXhlYyhzb3VyY2UpKSkge1xuICAgICAgICAvLyBsb2cobWF0Y2hbMF0pO1xuICAgICAgICBjb25zdCBbZGVjbGFyYXRpb24sIGludGVudCwgYmluZGluZ3MsIGJpbmRpbmcsICwgc3BlY2lmaWVyXSA9IG1hdGNoO1xuICAgICAgICBjb25zdCBtYXBwaW5ncyA9IChcbiAgICAgICAgICAoYmluZGluZyAmJiAoKGJpbmRpbmcuc3RhcnRzV2l0aCgnKiAnKSAmJiBiaW5kaW5nKSB8fCBgZGVmYXVsdCBhcyAke2JpbmRpbmd9YCkpIHx8XG4gICAgICAgICAgYmluZGluZ3MgfHxcbiAgICAgICAgICAnJ1xuICAgICAgICApLnNwbGl0KC8gKiwgKi9nKTtcbiAgICAgICAgY29uc3QgdXJsID0gKHNwZWNpZmllciAmJiB0aGlzLnJlc29sdmUoc3BlY2lmaWVyLCByZWZlcnJlcikpIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgLy8gbG9nKHtkZWNsYXJhdGlvbiwgYmluZGluZ3MsIGJpbmRpbmcsIHNwZWNpZmllciwgbWFwcGluZ3N9KTtcbiAgICAgICAgd2hpbGUgKChtYXRjaCA9IE1hcHBpbmdzLmV4ZWMobWFwcGluZ3MpKSkge1xuICAgICAgICAgIGNvbnN0IFssIGlkZW50aWZpZXIsIGJpbmRpbmcgPSBpZGVudGlmaWVyXSA9IG1hdGNoO1xuICAgICAgICAgIGxpbmtzW2JpbmRpbmddID0ge2ludGVudCwgc3BlY2lmaWVyLCBpZGVudGlmaWVyLCBiaW5kaW5nLCB1cmx9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbGlua3M7XG4gICAgfVxuXG4gICAgYmluZChuYW1lc3BhY2UsIC4uLmJpbmRpbmdzKSB7XG4gICAgICBjb25zdCBkZXNjcmlwdG9ycyA9IHt9O1xuICAgICAgZm9yIChjb25zdCBiaW5kaW5nIG9mIGJpbmRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSB0eXBlb2YgYmluZGluZztcbiAgICAgICAgaWYgKHR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBjb25zdCBpZGVudGlmaWVyID0gKElkZW50aWZpZXIuZXhlYyhiaW5kaW5nKSB8fCAnJylbMF07XG4gICAgICAgICAgaWRlbnRpZmllciAmJiBiaW5kKG5hbWVzcGFjZSwgaWRlbnRpZmllciwgYmluZGluZywgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGlkZW50aWZpZXIgaW4gYmluZGluZykge1xuICAgICAgICAgICAgaWRlbnRpZmllciA9PT0gKElkZW50aWZpZXIuZXhlYyhpZGVudGlmaWVyKSB8fCAnJylbMF0gJiZcbiAgICAgICAgICAgICAgYmluZChuYW1lc3BhY2UsIGlkZW50aWZpZXIsIGJpbmRpbmdbaWRlbnRpZmllcl0sIHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcbn0pKCk7XG4iLCJpbXBvcnQge01vZHVsZU5hbWVzcGFjZXN9IGZyb20gJy4vbmFtZXNwYWNlcy5tanMnO1xuaW1wb3J0IHtNb2R1bGVFdmFsdWF0b3J9IGZyb20gJy4vZXZhbHVhdG9yLm1qcyc7XG5pbXBvcnQge01vZHVsZVN0cmFwcGVyfSBmcm9tICcuL3N0cmFwcGVyLm1qcyc7XG5pbXBvcnQge2NyZWF0ZSwgZGVmaW5lLCBmcmVlemUsIHNldFByb3RvdHlwZU9mfSBmcm9tICcuL2hlbHBlcnMubWpzJztcblxuZXhwb3J0IGNsYXNzIE1vZHVsZSB7XG4gIGNvbnN0cnVjdG9yKHVybCwgZXZhbHVhdG9yLCBpbXBvcnRzKSB7XG4gICAgY29uc3QgZW51bWVyYWJsZSA9IGZhbHNlO1xuICAgIGRlZmluZSh0aGlzLCAndXJsJywgdXJsLCBlbnVtZXJhYmxlKTtcbiAgICBkZWZpbmUodGhpcywgJ2V2YWx1YXRvcicsIE1vZHVsZUV2YWx1YXRvcihldmFsdWF0b3IpLCBlbnVtZXJhYmxlKTtcbiAgICBkZWZpbmUodGhpcywgJ2NvbnRleHQnLCBjcmVhdGUobnVsbCwgY29udGV4dHVhbHMpLCBlbnVtZXJhYmxlLCBmYWxzZSk7XG4gICAgZGVmaW5lKHRoaXMsICdiaW5kaW5ncycsIGNyZWF0ZShudWxsKSwgZW51bWVyYWJsZSk7XG4gICAgZGVmaW5lKHRoaXMsICdsaW5rcycsIE1vZHVsZS5saW5rcyhpbXBvcnRzIHx8IGAke2V2YWx1YXRvcn1gLCB1cmwpLCBlbnVtZXJhYmxlLCBmYWxzZSk7XG4gICAgdGhpcy5uYW1lc3BhY2VzIHx8IGRlZmluZShuZXcudGFyZ2V0LnByb3RvdHlwZSwgJ25hbWVzcGFjZXMnLCBuZXcgTW9kdWxlTmFtZXNwYWNlcygpLCBmYWxzZSk7XG4gICAgTW9kdWxlLm1hcFt1cmxdID0gdGhpcztcbiAgfVxuXG4gIGxpbmsoKSB7XG4gICAgY29uc3QgcHJvbWlzZSA9IE1vZHVsZS5saW5rKHRoaXMpO1xuICAgIGRlZmluZSh0aGlzLCAnbGluaycsICgpID0+IHByb21pc2UpO1xuICAgIHJldHVybiBwcm9taXNlO1xuICB9XG5cbiAgaW5zdGFudGlhdGUoKSB7XG4gICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlIHx8IE1vZHVsZS5pbnN0YW50aWF0ZSh0aGlzKTtcbiAgICBjb25zdCBwcm9taXNlID0gdGhpcy5saW5rKCkudGhlbigoKSA9PiBpbnN0YW5jZSk7XG4gICAgZGVmaW5lKHRoaXMsICdpbnN0YW50aWF0ZScsICgpID0+IHByb21pc2UpO1xuICAgIHJldHVybiBwcm9taXNlO1xuICB9XG5cbiAgZXZhbHVhdGUoKSB7XG4gICAgY29uc3QgcHJvbWlzZSA9IE1vZHVsZS5ldmFsdWF0ZSh0aGlzKS50aGVuKCgpID0+IHRoaXMubmFtZXNwYWNlKTtcbiAgICBkZWZpbmUodGhpcywgJ2V2YWx1YXRlJywgKCkgPT4gcHJvbWlzZSk7XG4gICAgcmV0dXJuIHByb21pc2U7XG4gIH1cbn1cblxuLyoqIFByb3BlcnRpZXMgaW5qZWN0ZWQgaW50byBldmVyeSBtb2R1bGUgY29udGV4dCAqL1xuY29uc3QgY29udGV4dHVhbHMgPSB7fTtcblxuTW9kdWxlLmRlYnVnZ2luZyA9ICgoKSA9PiB7XG4gIGNvbnN0IGRlYnVnID0gKHR5cGUsIC4uLmFyZ3MpID0+IHtcbiAgICBjb25zb2xlLmxvZyh0eXBlLCAuLi5hcmdzKTtcbiAgICAvLyB0eXBlIGluIGRlYnVnZ2luZyAmJiBkZWJ1Z2dpbmdbdHlwZV0gbnVsbCwgYXJncyk7XG4gIH07XG4gIGNvbnN0IGRlYnVnZ2luZyA9IChkZWJ1Zy5kZWJ1Z2dpbmcgPSB7fSk7XG4gIGNvbnRleHR1YWxzLmRlYnVnID0ge3ZhbHVlOiBmcmVlemUoZGVidWcpfTtcbiAgcmV0dXJuIGRlYnVnZ2luZztcbn0pKCk7XG5cbnNldFByb3RvdHlwZU9mKE1vZHVsZSwgbmV3IE1vZHVsZVN0cmFwcGVyKCkpO1xuIiwiaW1wb3J0IHtmcmVlemUsIHNldFByb3RvdHlwZU9mfSBmcm9tICcuL2hlbHBlcnMubWpzJztcbmltcG9ydCB7TW9kdWxlfSBmcm9tICcuL21vZHVsZS5tanMnO1xuXG5leHBvcnQgY29uc3QgR2xvYmFsU2NvcGUgPVxuICAodHlwZW9mIHNlbGYgPT09ICdvYmplY3QnICYmIHNlbGYgJiYgc2VsZi5zZWxmKSB8fFxuICAodHlwZW9mIGdsb2JhbCA9PT0gJ29iamVjdCcgJiYgZ2xvYmFsICYmIGdsb2JhbC5nbG9iYWwpIHx8XG4gICgoKSA9PiAoMSwgZXZhbCkoJ3RoaXMnKSkoKTtcblxuY29uc3QgZ2xvYmFscyA9ICgoe2V2YWw6ICRldmFsfSkgPT4gKHtcbiAgZXZhbDogJGV2YWwsXG4gIE1vZHVsZSxcbn0pKShHbG9iYWxTY29wZSk7XG5cbmNvbnN0IHNjb3BlID0gZnJlZXplKHNldFByb3RvdHlwZU9mKHsuLi5nbG9iYWxzfSwgR2xvYmFsU2NvcGUpKTtcblxuY29uc3QgbG9jYWxzID0ge307XG5cbmV4cG9ydCBjb25zdCBNb2R1bGVTY29wZSA9IG5ldyBQcm94eShzY29wZSwge1xuICBnZXQ6ICh0YXJnZXQsIHByb3BlcnR5LCByZWNlaXZlcikgPT4ge1xuICAgIGlmIChwcm9wZXJ0eSBpbiBnbG9iYWxzKSByZXR1cm4gZ2xvYmFsc1twcm9wZXJ0eV07XG4gICAgY29uc3QgdmFsdWUgPVxuICAgICAgcHJvcGVydHkgaW4gR2xvYmFsU2NvcGUgJiYgdHlwZW9mIHByb3BlcnR5ID09PSAnc3RyaW5nJyA/IEdsb2JhbFNjb3BlW3Byb3BlcnR5XSA6IHVuZGVmaW5lZDtcbiAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjb25zdCBsb2NhbCA9IGxvY2Fsc1twcm9wZXJ0eV07XG4gICAgICBjb25zdCB7cHJveHl9ID1cbiAgICAgICAgKGxvY2FsICYmIGxvY2FsLnZhbHVlID09PSB2YWx1ZSAmJiBsb2NhbCkgfHxcbiAgICAgICAgKGxvY2Fsc1twcm9wZXJ0eV0gPSB7XG4gICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgcHJveHk6IG5ldyBQcm94eSh2YWx1ZSwge1xuICAgICAgICAgICAgY29uc3RydWN0OiAoY29uc3RydWN0b3IsIGFyZ0FycmF5LCBuZXdUYXJnZXQpID0+XG4gICAgICAgICAgICAgIFJlZmxlY3QuY29uc3RydWN0KHZhbHVlLCBhcmdBcnJheSwgbmV3VGFyZ2V0KSxcbiAgICAgICAgICAgIGFwcGx5OiAobWV0aG9kLCB0aGlzQXJnLCBhcmdBcnJheSkgPT5cbiAgICAgICAgICAgICAgdGhpc0FyZyA9PSBudWxsIHx8IHRoaXNBcmcgPT09IHJlY2VpdmVyXG4gICAgICAgICAgICAgICAgPyB2YWx1ZSguLi5hcmdBcnJheSlcbiAgICAgICAgICAgICAgICA6IFJlZmxlY3QuYXBwbHkodmFsdWUsIHRoaXNBcmcsIGFyZ0FycmF5KSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgfSk7XG4gICAgICByZXR1cm4gcHJveHk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbiAgfSxcbiAgc2V0OiAoZ2xvYmFscywgcHJvcGVydHkpID0+IHtcbiAgICB0aHJvdyBSZWZlcmVuY2VFcnJvcihgJHtwcm9wZXJ0eX0gaXMgbm90IGRlZmluZWRgKTtcbiAgfSxcbn0pO1xuIiwiaW1wb3J0IHtNb2R1bGVTY29wZSwgR2xvYmFsU2NvcGV9IGZyb20gJy4vc2NvcGUubWpzJztcblxuR2xvYmFsU2NvcGUuTW9kdWxlU2NvcGUgPSBNb2R1bGVTY29wZTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7RUFBTyxNQUFNLENBQUMsY0FBYyxFQUFFLHdCQUF3QixDQUFDLEdBQUcsT0FBTyxDQUFDO0FBQ2xFLEVBQU8sTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFDOztBQUV2RCxFQUFPLE1BQU0sSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDOztBQUU3QixFQUFPLE1BQU0sTUFBTSxHQUFHLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsVUFBVSxHQUFHLEtBQUssRUFBRSxZQUFZLEdBQUcsS0FBSztFQUN4RixFQUFFLGNBQWMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQzs7QUFFL0UsRUFBTyxNQUFNLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxF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
