//@ts-check

import {ModuleNamespaces} from './namespaces.js';
import {ModuleEvaluator} from './evaluator.js';
import {ModuleStrapper} from './strapper.js';
import {create, setProperty, freeze, setPrototypeOf} from './helpers.js';
import {environment} from './environment.js';

/** @augments {Module} */
export class DynamicModule {
	/** @param {string} url @param {Function} evaluator @param {Scope} scope */
	constructor(url, evaluator, scope) {
		const enumerable = false;
		setProperty(this, 'url', url, enumerable);
		setProperty(this, 'evaluator', (evaluator = ModuleEvaluator({source: evaluator, url})), enumerable);
		setProperty(this, 'scope', scope, enumerable);
		//@ts-ignore
		setProperty(this, 'context', create(null, contextuals), enumerable, false);
		setProperty(this, 'bindings', create(null), enumerable);
		//@ts-ignore
		setProperty(this, 'links', {...evaluator.links}, enumerable, false);

		this.namespaces ||
			setProperty(new.target.prototype, 'namespaces', new ModuleNamespaces(url => new.target.import(url)), false);

		new.target.map[url] = this;
	}

	link() {
		const promise = DynamicModule.link(this);
		setProperty(this, 'link', () => promise);
		return promise;
	}

	instantiate() {
		const instance = this.instance || DynamicModule.instantiate(this);
		const promise = this.link().then(() => instance);
		setProperty(this, 'instantiate', () => promise);
		return promise;
	}

	evaluate() {
		const promise = DynamicModule.evaluate(this).then(() => this.namespace);
		setProperty(this, 'evaluate', () => promise);
		return promise;
	}
}

/** Properties injected into every module context */
const contextuals = {};

DynamicModule.environment = environment;

// DynamicModule.environment = environment.

DynamicModule.debugging = (() => {
	const debug = (type, ...args) => {
		console.log(type, ...args);
		// type in debugging && debugging[type] null, args);
	};
	const debugging = (debug.debugging = {});
	contextuals.debug = {value: freeze(debug)};
	return debugging;
})();

{
	const moduleStrapper = new ModuleStrapper();
	/** @type {ModuleStrapper['map']} */
	DynamicModule.map = moduleStrapper.map;
	/** @type {ModuleStrapper['link']} */
	DynamicModule.link = moduleStrapper.link;
	/** @type {ModuleStrapper['instantiate']} */
	DynamicModule.instantiate = moduleStrapper.instantiate;
	/** @type {ModuleStrapper['evaluate']} */
	DynamicModule.import = moduleStrapper.import;
	/** @type {ModuleStrapper['evaluate']} */
	DynamicModule.evaluate = moduleStrapper.evaluate;

	DynamicModule.prototype.evaluator = undefined;
	/** @type {Module['url']} */
	DynamicModule.prototype.url = undefined;
	/** @type {Evaluator} */
	DynamicModule.prototype.evaluator = undefined;
	/** @type {Module['scope']} */
	DynamicModule.prototype.scope = undefined;
	/** @type {Module['context']} */
	DynamicModule.prototype.context = undefined;
	/** @type {Module['bindings']} */
	DynamicModule.prototype.bindings = undefined;
	/** @type {Module['links']} */
	DynamicModule.prototype.links = undefined;
	/** @type {Module['instance']} */
	DynamicModule.prototype.instance = undefined;
	/** @type {Module['namespace']} */
	DynamicModule.prototype.namespace = undefined;

	/** @type {Namespaces} */
	DynamicModule.prototype.namespaces = undefined;

	setPrototypeOf(DynamicModule, moduleStrapper);
}

/** @typedef {import('./types').modules.Namespaces} Namespaces */
/** @typedef {import('./types').modules.Module} Module */
/** @typedef {import('./types').modules.Module.Scope} Scope */
/** @typedef {import('./types').modules.DynamicModule.Evaluator} Evaluator */
