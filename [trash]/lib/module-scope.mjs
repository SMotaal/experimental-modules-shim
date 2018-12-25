import Module from './module.mjs';

const {freeze, setPrototypeOf} = Object;
const GlobalScope = (1, eval)('this');
const globals = (({eval: $eval, Object}) => ({eval: $eval, Object, Module}))(GlobalScope);

export default new Proxy(freeze(setPrototypeOf({...globals}, GlobalScope)), {
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

// import ModuleNamespace from './module-namespace.mjs';
// import ModuleEvaluator from './module-evaluator.mjs';

// const {defineProperty, getOwnPropertyDescriptor} = Reflect;
// const {freeze, setPrototypeOf} = Object;
// const {log, warn} = console;
// const noop = () => {};
// const define = (target, property, value, enumerable = false, configurable = false) =>
//   defineProperty(target, property, {value, enumerable, configurable}) && value;
// const bind = (target, property, get, enumerable = false, configurable = false) =>
//   defineProperty(target, property, {get, set: noop, configurable, enumerable});
// const copy = (target, source, identifier, alias = identifier) =>
//   defineProperty(target, alias, getOwnPropertyDescriptor(source, identifier));

// const raw = String.raw;
// const ResolvedPromise = Promise.resolve();
// const BindExpression = /^(?:\(?\)?|(\S+)) => (\S+)$/;
// const Identifier = /[^\n\s\(\)\{\}\-=+*/%`"~!&.:^<>,]+/;
// const Mappings = /([^\s,]+)(?: +as +([^\s,]+))?/g;
// // const BindingDeclarations = /\b(import|export)\b(?: +(?:{ *([^};]*) *}|([*] +as +\S+|\S+)) +from\b|) +(['"])(.*?)\4/g;
// // const BindingDeclarations = /\b(import|export)\b(?: +(?:{ *([^};]*) *}|([*] +as +\S+|\S+)) +from\b|(?= +['"]))(?: +(['"])(.*?)\4| *;? *\n)/g;
// const BindingDeclarations = /\b(import|export)\b +(?:{ *(.*?) *}|([*] +as +\S+|\S+)|)(?: +from\b|)(?: +(['"])(.*?)\4|)/g;
// const Specifier = /^(?:([a-z]+[^/]*?:)\/{0,2}(\b[^/]+\/?)?)(\.{0,2}\/)?([^#?]*?)(\?[^#]*?)?(#.*?)?$/u;
// Specifier.parse = specifier => {
//   const [url, schema, domain, root, path, query, fragment] = Specifier.exec(specifier) || '';
//   return {url, schema, domain, root, path, query, fragment, specifier};
// };

// const ENUMERABLE = true;

// class Module {
//   constructor(url, evaluator, imports) {
//     const enumerable = false;
//     define(this, 'url', url, enumerable);
//     define(this, 'evaluator', ModuleEvaluator(evaluator), enumerable);
//     // define(this, 'context', null, enumerable, true);
//     define(this, 'context', Object.create(null), enumerable, false);
//     define(this, 'bindings', Object.create(null), enumerable);
//     define(this, 'links', Module.links(imports || `${evaluator}`, url), enumerable, false);
//     this.namespaces || define(new.target.prototype, 'namespaces', new ModuleNamespaces(), false);
//     Module.map[url] = this;
//   }

//   link() {
//     const promise = Module.link(this);
//     define(this, 'link', () => promise);
//     return promise;
//   }

//   instantiate() {
//     const instance = this.instance || Module.instantiate(this);
//     const promise = this.link().then(() => instance);
//     define(this, 'instantiate', () => promise);
//     return promise;
//   }

//   evaluate() {
//     // if (this.exception) throw this.exception;
//     const promise = Module.evaluate(this).then(() => this.namespace);
//     define(this, 'evaluate', () => promise);
//     return promise;
//   }

//   static async link(module) {
//     const enumerable = true;
//     const {namespaces, context, bindings, links} = module;
//     const promises = [];
//     const imports = {};
//     const dependencies = {[module.url]: true};

//     // let context;
//     for (const binding in links) {
//       const link = links[binding];
//       const {intent, specifier, identifier, url} = link;
//       if (!url) continue;
//       // log({specifier, identifier, url});
//       const namespace = namespaces[url];
//       // const linked = dependencies[url] || (dependencies[url] = Module.map[url].link());
//       const imported =
//         url &&
//         (imports[url] || (imports[url] = (namespace && ResolvedPromise) || namespaces.import(url)));
//       if (intent === 'import') {
//         promises.push(
//           imported.then(() => {
//             identifier === '*'
//               ? copy(bindings, namespaces, url, binding)
//               : copy(bindings, namespaces[url], identifier, binding);
//           }),
//         );
//         bind(bindings, binding, noop, enumerable, true);
//       } else if (intent === 'export') {
//         promises.push(
//           imported.then(async () => {
//             context.export.from(link);
//           }),
//         );
//       }
//     }

//     await Promise.all(promises);
//   }

//   static instantiate(module) {
//     const enumerable = false;
//     const namespace = new ModuleNamespace();
//     const {context, bindings, namespaces} = module;
//     context.export = (...exports) => void Module.bind(namespace, ...exports);
//     context.export.from = (...links) => {
//       for (const link of links) {
//         const {intent, specifier, identifier, binding, url} = link;
//         if (intent !== 'export') continue;
//         url in namespaces
//           ? copy(namespace, namespaces[url], identifier, binding)
//           : bind(namespace, binding, () => namespaces[url][identifier], enumerable, false);
//       }
//     };
//     context.export.default = value => void Module.bind(namespace, {default: () => value});

//     const scope = setPrototypeOf(bindings, ModuleScope);
//     define(bindings, 'module', context, false, true);
//     define(context, 'meta', Object.create(null), false, false);
//     define(context, 'scope', scope, enumerable, false);
//     freeze(context);
//     return define(module, 'instance', {namespace, context});
//   }

//   static async evaluate(module) {
//     const {bindings, namespace, context} = await module.instantiate();
//     try {
//       await module.evaluator(context, context.export);
//       return define(module, 'namespace', namespace);
//     } catch (exception) {
//       warn(exception);
//       define(module, 'exception', exception);
//     }
//   }

//   static async import(url) {
//     const module = this.map[url];
//     return module.namespace || (await module.evaluate());
//   }

//   static resolve(specifier, referrer) {
//     specifier = `${(specifier && specifier) || ''}`;
//     referrer = `${(referrer && referrer) || ''}` || '';
//     const key = `[${referrer}][${specifier}]`;
//     const cache = this.resolve.cache || (this.resolve.cache = {});
//     let url = cache[key];
//     if (url) return url.link;
//     const {schema, domain} = Specifier.parse(specifier);
//     const origin = (schema && `${schema}${domain || '//'}`) || `file:///`;
//     referrer =
//       (!referrer && origin) ||
//       (cache[`[${referrer}]`] || (cache[`[${referrer}]`] = new URL(referrer, origin))).href;
//     url = cache[key] = new URL(specifier, referrer);
//     // log({specifier, referrer, origin, schema, domain, url: url.href});
//     return (url.link = url.href.replace(/^file:\/\/\//, ''));
//   }

//   static links(source, referrer) {
//     // log({declarations});
//     let match;
//     const links = {};
//     while ((match = BindingDeclarations.exec(source))) {
//       // log(match[0]);
//       const [declaration, intent, bindings, binding, , specifier] = match;
//       const mappings = (
//         (binding && ((binding.startsWith('* ') && binding) || `default as ${binding}`)) ||
//         bindings ||
//         ''
//       ).split(/ *, */g);
//       const url = (specifier && this.resolve(specifier, referrer)) || undefined;
//       // log({declaration, bindings, binding, specifier, mappings});
//       while ((match = Mappings.exec(mappings))) {
//         const [, identifier, binding = identifier] = match;
//         links[binding] = {intent, specifier, identifier, binding, url};
//       }
//     }
//     return links;
//   }

//   static bind(namespace, ...bindings) {
//     const descriptors = {};
//     for (const binding of bindings) {
//       const type = typeof binding;
//       if (type === 'function') {
//         const identifier = (Identifier.exec(binding) || '')[0];
//         identifier && bind(namespace, identifier, binding, true);
//       } else if (type === 'object') {
//         for (const identifier in binding) {
//           identifier === (Identifier.exec(identifier) || '')[0] &&
//             bind(namespace, identifier, binding[identifier], true);
//         }
//       }
//     }
//   }
// }

// Module.map = {};
// setPrototypeOf(Module, Module.prototype);

// class ModuleNamespaces {
//   import(url) {
//     return (
//       this[url] ||
//       define(this, url, Module.import(url).then(
//         namespace => (bind(this, url, () => namespace, true, false), namespace),
//       ), true, true)
//     );
//   }
// }

// const ModuleScope = (() => {
//   const GlobalScope = (1, eval)('this');
//   const globals = (({eval: $eval, Object}) => ({eval: $eval, Object, Module}))(GlobalScope);
//   const moduleScope = new Proxy(freeze(setPrototypeOf({...globals}, GlobalScope)), {
//     get: (target, property) => {
//       if (typeof property !== 'string') return;
//       if (property in globals) return globals[property];
//       const value = GlobalScope[property];
//       return (value && typeof value === 'function' && value.bind(GlobalScope)) || value;
//     },
//     set: (target, property) => {
//       throw ReferenceError(`${property} is not defined`);
//     },
//   });

//   return moduleScope;
// })();

// export default ModuleScope;

// // function ModuleNamespace() {
// //   defineProperty(this, Symbol.toStringTag, {value: 'ModuleNamespace', enumerable: false});
// // }
// // ModuleNamespace.prototype = null;
