import {ModuleNamespaces} from './namespaces.js';
import {ModuleEvaluator} from './evaluator.js';
import {ModuleStrapper} from './strapper.js';
import {create, setProperty, freeze, setPrototypeOf} from './helpers.js';

export class Module {
	constructor(url, evaluator, scope) {
		const enumerable = false;
		setProperty(this, 'url', url, enumerable);
		setProperty(this, 'evaluator', ModuleEvaluator(evaluator), enumerable);
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
