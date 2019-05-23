import {ModuleNamespace} from './namespace.js';
import {Identifier, Specifier} from './expressions.js';

import {
	create,
	entries,
	freeze,
	setProperty,
	bindProperty,
	setPrototypeOf,
	copyProperty,
	ResolvedPromise,
	Reflect,
} from './helpers.js';

export class ModuleStrapper {
	get map() {
		if (this !== this.constructor.prototype) return setProperty(this, 'map', create(null));
	}

	throw(error) {
		throw error;
	}

	// async createLinkedBinding(namespaces, linkURL, linkedBinding, bindingRecords, bindingIdentifier) {
	async createLinkedImportBinding(bindingStatus) {
		let exportedNamespace;
		const {
			namespaces,
			linkURL,
			linkingRecord,
			moduleURL,
			bindingRecords,
			bindingIdentifier,
			moduleContext,
			traceId,
			linkedNamespace = (bindingStatus.linkedNamespace = namespaces[linkURL] || namespaces.import(linkURL)),
		} = bindingStatus;
		bindingStatus.traceId && console.log(bindingStatus.traceId, bindingStatus);
		linkedNamespace ||
			this.throw(
				new ReferenceError(
					`Cannot create linked imported binding against ‹${linkURL}› prior to the creation of its namespace record`,
				),
			);
		bindingIdentifier ||
			this.throw(new ReferenceError(`Cannot create linked import binding without a binding identifier`));

		// Make a TBD binding
		bindProperty(bindingRecords, bindingIdentifier, undefined, true, true);

		// Make the actual binding
		linkingRecord.identifier !== '*'
			? copyProperty(
					bindingRecords,
					(exportedNamespace =
						bindingStatus.exportedNamespace || (bindingStatus.exportedNamespace = await linkedNamespace)),
					linkingRecord.identifier,
					bindingIdentifier,
			  )
			: ((exportedNamespace =
					bindingStatus.exportedNamespace || (bindingStatus.exportedNamespace = await linkedNamespace)),
			  copyProperty(bindingRecords, namespaces, linkURL, bindingIdentifier));
		// Update linked binding status
		bindingStatus.isLinked = true;

		bindingStatus.traceId && console.log(bindingStatus.traceId, bindingStatus);
	}
	async createLinkedExportBinding(bindingStatus) {
		let exportedNamespace;
		const {
			namespaces,
			linkURL,
			linkingRecord,
			moduleURL,
			bindingRecords,
			bindingIdentifier,
			moduleContext,
			traceId,
			linkedNamespace = (bindingStatus.linkedNamespace = namespaces[linkURL] || namespaces.import(linkURL)),
		} = bindingStatus;

		bindingStatus.traceId && console.log(bindingStatus.traceId, bindingStatus);

		linkedNamespace ||
			this.throw(
				new ReferenceError(
					`Cannot create linked export binding against ‹${linkURL}› prior to the creation of its namespace record`,
				),
			);

		// Make a TBD binding
		bindProperty(moduleContext.namespace, bindingIdentifier, undefined, true, true);

		// Make the actual binding
		linkingRecord.identifier !== '*'
			? ((exportedNamespace =
					bindingStatus.exportedNamespace || (bindingStatus.exportedNamespace = await linkedNamespace)),
			  copyProperty(moduleContext.namespace, exportedNamespace, linkingRecord.identifier, bindingIdentifier))
			: this.throw(
					new TypeError(
						`Cannot create linked "export * as" binding against ‹${linkURL}› since it is not a valid binding type`,
					),
			  );

		// Update linked binding status
		bindingStatus.isLinked = true;

		bindingStatus.traceId && console.log(bindingStatus.traceId, bindingStatus);
	}

	link(module) {
		let linkURL, bindingStatus;
		const {namespaces, context: moduleContext, bindings: bindingRecords, links, url: moduleURL} = module;

		const promises = [];

		for (const [bindingIdentifier, linkingRecord] of entries(links)) {
			if (
				!(linkingRecord.intent === 'import' || linkingRecord.intent === 'export') ||
				!(linkURL = linkingRecord.url || (linkingRecord.specifier && this.resolve(linkingRecord.specifier, moduleURL)))
			)
				continue;

			bindingStatus = {
				isLinked: false,
				namespaces,
				linkURL,
				linkingRecord,
				moduleURL,
				bindingRecords,
				bindingIdentifier,
				moduleContext,
				// traceId: `${linkingRecord.intent} ${moduleURL}#${bindingIdentifier} ‹ ${linkURL}#${linkingRecord.identifier}`,
			};

			bindingStatus.traceId && console.log(bindingStatus.traceId, bindingStatus);
			promises.push(
				(bindingStatus.promise = this[
					linkingRecord.intent === 'import' ? 'createLinkedImportBinding' : 'createLinkedExportBinding'
				](bindingStatus)),
			);
		}

		return promises.length ? Promise.all(promises).then(() => {}) : Promise.resolve();
	}

	instantiate(module) {
		const enumerable = false;
		const namespace = new ModuleNamespace();
		const {context, bindings, namespaces, url, scope} = module;

		context.export = (...exports) => void this.bind(namespace, ...exports);

		Reflect.defineProperty(context.export, 'default', {
			set: value => void this.bind(namespace, {default: () => value}),
		});

		freeze(context.export);

		setProperty(bindings, 'module', context, false, true);
		setProperty(context, 'namespace', namespace);
		setProperty(context, 'scope', setPrototypeOf(bindings, scope || null), enumerable, false);
		setProperty(context, 'meta', create(null), false, false);
		setProperty(context.scope, 'meta', context.meta, false, false);
		setProperty(context.meta, 'url', url);

		// TODO: To be used for top-level await
		let awaits = void Reflect.defineProperty(context, 'await', {get: () => awaits, set: value => (awaits = value)});

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
}
