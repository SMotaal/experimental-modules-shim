import {ModuleScope} from './scope.js';
import {ModuleNamespace} from './namespace.js';
import {Identifier, Mappings, BindingDeclarations, Specifier} from './expressions.js';

import {
	noop,
	setProperty,
	defineProperty,
	bindProperty,
	copyProperty,
	create,
	setPrototypeOf,
	freeze,
	ResolvedPromise,
} from './helpers.js';

export const ModuleStrapper = (() => {
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
				await module.evaluator(context, context.export);
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
