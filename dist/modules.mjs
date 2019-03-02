const {defineProperty, getOwnPropertyDescriptor} = Reflect;
const {create, freeze, setPrototypeOf} = Object;

const noop = () => {};

const setProperty = (target, property, value, enumerable = false, configurable = false) =>
	defineProperty(target, property, {value, enumerable, configurable}) && value;

const bindProperty = (target, property, get, enumerable = false, configurable = false) =>
	defineProperty(target, property, {get, set: noop, configurable, enumerable});

const copyProperty = (target, source, identifier, alias = identifier) =>
	defineProperty(target, alias, getOwnPropertyDescriptor(source, identifier));

const ResolvedPromise = Promise.resolve();

const GlobalScope =
	(typeof self === 'object' && self && self.self) ||
	(typeof global === 'object' && global && global.global) ||
	(() => (0, eval)('this'))();

const globals = (({eval: $eval}) => ({
	eval: $eval,
}))(GlobalScope);

const scope = freeze(setPrototypeOf({...globals}, GlobalScope));

const locals = {};

const ModuleScope = new Proxy(scope, {
	get(target, property, receiver) {
		if (property in globals) return globals[property];
		const value = property in GlobalScope && typeof property === 'string' ? GlobalScope[property] : undefined;
		if (value && typeof value === 'function') {
			const local = locals[property];
			return (
				(local && local.value === value && local) ||
				(locals[property] = {
					value,
					proxy: new Proxy(value, {
						construct(constructor, argArray, newTarget) {
							return Reflect.construct(value, argArray, newTarget);
						},
						apply(method, thisArg, argArray) {
							return thisArg == null || thisArg === receiver
								? value(...argArray)
								: Reflect.apply(value, thisArg, argArray);
						},
					}),
				})
			).proxy;
		}
		return value;
	},
	set(target, property, value, receiver) {
		if (receiver !== ModuleScope) {
			throw ReferenceError(`${property} is not defined`);
		}
		return Reflect.set(GlobalScope, property, value);
	},
});

class ModuleNamespaces {
	import(url) {
		return (
			this[url] ||
			setProperty(
				this,
				url,
				DynamicModule.import(url).then(namespace => (bindProperty(this, url, () => namespace, true, false), namespace)),
				true,
				true,
			)
		);
	}
}

/** ECMAScript quoted strings: `'…'` or `"…"`  */

/** First coherent indent spaces in a string */
const Indent = /(?:^|\n)([ \t]+)/;

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

const wrap = (code, source, url, indent = '    ') => `
(function* (module, exports) {
  module.debug('module-url', module.meta.url);
  module.debug('compiled-text', ${JSON.stringify((code = reindent(code, indent)))});
  module.debug('source-text', ${JSON.stringify(reindent(source, indent))});
  with(module.scope) (function () {
    "use strict";
${code}${url ? `\n\n${indent}//# sourceURL=${`${new URL(url, 'file:///')}`.replace(/^file:/i, 'virtual:')}` : ''}
  })();
})
`;

const reindent = (source, newIndent = '') => {
	source = source.replace(/^\t/gm, '  ');
	const [, currentIndent] = Indent.exec(source) || '';
	return currentIndent ? source.replace(new RegExp(`^${currentIndent}`, 'mg'), newIndent) : source;
};

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
	(typeof source === 'function' && /^\(module, exports\) *=> *{([^]*)}$|/.exec(`${source}`.trim())[1]) || '';

class CompiledModuleEvaluator {
	toString() {
		return this.sourceText;
	}
}

const ModuleEvaluator = ({
	source,
	sourceText = (typeof source === 'function' && parseFunction(source)) || source,
	url,
	compiledText = rewrite(sourceText),
}) =>
	Object.setPrototypeOf(
		Object.defineProperties(evaluate(wrap(compiledText, sourceText, url)), {
			sourceText: {value: sourceText, enumerable: true},
			compiledText: {value: compiledText, enumerable: true},
			url: {value: url, enumerable: true},
		}),
		CompiledModuleEvaluator,
	);

/// <reference path='../global.d.ts' />
//@ts-check

/// Internal

/** @type {ObjectConstructor} */
//@ts-ignore
const Object$1 = {}.constructor;

const bindings = Object$1.create(null);

/** @typedef {import('../types').Globals} Globals */
/** @type {{[K in keyof Globals]: Globals[K]}} */
const globals$1 = Object$1.create(bindings, {
  Request: {get: () => Request, set: value => (Request = value)},
});

/**
 * @template {keyof Globals} T
 * @param {T} name
 * @param {*} value
 * @returns {Globals[T]}
 */
const scoped = (name, value) => (
  name in bindings
    ? (bindings[name] = value)
    : Object$1.defineProperty(globals$1, name, {value, enumerable: true, configurable: true}),
  value
);

const rebind = (b, a) =>
  function() {
    return arguments.length ? b(a(arguments[0])) : b();
  };

/**
 * @template {keyof Globals} T
 * @template {(value?: Globals[T]) => Globals[T] | void} U
 * @param {T} name
 * @param {U} bind
 * @returns {U}
 */
const binding = (name, bind) => (
  name in bindings &&
    //@ts-ignore
    (bind = rebind(bind, Object$1.getOwnPropertyDescriptor(bindings, name).get)),
  //@ts-ignore
  Object$1.defineProperty(bindings, name, {get: bind, set: bind, enumerable: true, configurable: true}),
  bind
);

/// Scoped

const scopedSelf = scoped('self', (typeof self === 'object' && self && self.self === self && self) || undefined);

const scopedGlobal = scoped(
  'global',
  (typeof global === 'object' && global && global.global === global && global) || undefined,
);

scoped('Object', Object$1);

const scope$1 = scopedSelf || scopedGlobal || (0, eval)('this');

/// Bindings
let Request;

binding('Request', function() {
  return arguments.length ? (Request = arguments[0]) : Request;
})(scopedSelf && scopedSelf.Request);

let Response;

binding('Response', function() {
  return arguments.length ? (Response = arguments[0]) : Response;
})(scopedSelf && scopedSelf.Response);

let Headers;

binding('Headers', function() {
  return arguments.length ? (Headers = arguments[0]) : Headers;
})(scopedSelf && scopedSelf.Headers);

function ModuleNamespace() {}
{
	const toPrimitive = setPrototypeOf(() => 'ModuleNamespace', null);
	const toString = setPrototypeOf(() => 'class ModuleNamespace {}', null);
	const {toJSON} = {
		toJSON() {
			return Object$1.getOwnPropertyNames(this);
		},
	};
	ModuleNamespace.prototype = create(null, {
		[Symbol.toPrimitive]: {value: toPrimitive, enumerable: false},
		[Symbol.toStringTag]: {value: 'ModuleNamespace', enumerable: false},
		toJSON: {value: toJSON, enumerable: false},
	});
	freeze(setPrototypeOf(ModuleNamespace, create(null, {toString: {value: toString}})));
}

const ModuleStrapper = (() => {
	return class ModuleStrapper {
		get map() {
			if (this !== this.constructor.prototype) return setProperty(this, 'map', create(null));
		}

		async link(module) {
			const enumerable = true;
			const {namespaces, context, bindings, links} = module;
			const promises = [];
			const imports = {};

			for (const binding in links) {
				const link = links[binding];
				const {intent, specifier, identifier, url} = link;
				if (!url) continue;
				const namespace = namespaces[url];
				const imported =
					url && (imports[url] || (imports[url] = (namespace && ResolvedPromise) || namespaces.import(url)));
				if (intent === 'import') {
					promises.push(
						imported.then(() => {
							identifier === '*'
								? copyProperty(bindings, namespaces, url, binding)
								: copyProperty(bindings, namespaces[url], identifier, binding);
						}),
					);
					bindProperty(bindings, binding, noop, enumerable, true);
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
			const {context, bindings, namespaces, url, scope} = module;

			context.export = (...exports) => void this.bind(namespace, ...exports);
			context.export.from = (...links) => {
				for (const link of links) {
					const {intent, specifier, identifier, binding, url} = link;
					if (intent !== 'export') continue;
					url in namespaces
						? copyProperty(namespace, namespaces[url], identifier, binding)
						: bindProperty(namespace, binding, () => namespaces[url][identifier], enumerable, false);
				}
			};
			defineProperty(context.export, 'default', {
				set: value => void this.bind(namespace, {default: () => value}),
			});

			setProperty(bindings, 'module', context, false, true);
			setProperty(context, 'scope', setPrototypeOf(bindings, scope || null), enumerable, false);
			setProperty(context, 'meta', create(null), false, false);
			setProperty(context.scope, 'meta', context.meta, false, false);
			setProperty(context.meta, 'url', url);

			// TODO: To be used for top-level await
			let awaits = void defineProperty(context, 'await', {get: () => awaits, set: value => (awaits = value)});

			freeze(context);
			return setProperty(module, 'instance', {namespace, context});
		}

		async evaluate(module) {
			const {bindings, namespace, context} = await module.instantiate();
			try {
				// TODO: Ensure single execution
				module.evaluator(context, context.export).next();
				!context.await || (await context.await);
				return setProperty(module, 'namespace', namespace);
			} catch (exception) {
				console.warn(exception);
				setProperty(module, 'exception', exception);
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
				(!referrer && origin) || (cache[`[${referrer}]`] || (cache[`[${referrer}]`] = new URL(referrer, origin))).href;
			url = cache[key] = new URL(specifier, referrer);
			return (url.link = url.href.replace(/^file:\/\/\//, ''));
		}

		links(source, referrer) {
			let match;
			const links = {};
			while ((match = BindingDeclarations.exec(source))) {
				const [, intent, bindings, binding, , specifier] = match;
				const mappings = (
					(binding && ((binding.startsWith('* ') && binding) || `default as ${binding}`)) ||
					bindings ||
					''
				).split(/ *, */g);
				const url = (specifier && this.resolve(specifier, referrer)) || undefined;
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
					identifier && bindProperty(namespace, identifier, binding, true);
				} else if (type === 'object') {
					for (const identifier in binding) {
						identifier === (Identifier.exec(identifier) || '')[0] &&
							bindProperty(namespace, identifier, binding[identifier], true);
					}
				}
			}
		}
	};
})();

class DynamicModule {
	constructor(url, evaluator, scope) {
		const enumerable = false;
		setProperty(this, 'url', url, enumerable);
		setProperty(this, 'evaluator', ModuleEvaluator({source: evaluator, url}), enumerable);
		setProperty(this, 'scope', scope, enumerable);
		setProperty(this, 'context', create(null, contextuals), enumerable, false);
		setProperty(this, 'bindings', create(null), enumerable);
		setProperty(this, 'links', this.constructor.links(`${evaluator}`, url), enumerable, false);
		this.namespaces || setProperty(new.target.prototype, 'namespaces', new ModuleNamespaces(), false);
		this.constructor.map[url] = this;
	}

	link() {
		const promise = this.constructor.link(this);
		setProperty(this, 'link', () => promise);
		return promise;
	}

	instantiate() {
		const instance = this.instance || this.constructor.instantiate(this);
		const promise = this.link().then(() => instance);
		setProperty(this, 'instantiate', () => promise);
		return promise;
	}

	evaluate() {
		const promise = this.constructor.evaluate(this).then(() => this.namespace);
		setProperty(this, 'evaluate', () => promise);
		return promise;
	}
}

/** Properties injected into every module context */
const contextuals = {};

DynamicModule.debugging = (() => {
	const debug = (type, ...args) => {
		console.log(type, ...args);
		// type in debugging && debugging[type] null, args);
	};
	const debugging = (debug.debugging = {});
	contextuals.debug = {value: freeze(debug)};
	return debugging;
})();

setPrototypeOf(DynamicModule, new ModuleStrapper());

GlobalScope.DynamicModules = {ModuleScope, Module: DynamicModule};
//# sourceMappingURL=modules.mjs.map
