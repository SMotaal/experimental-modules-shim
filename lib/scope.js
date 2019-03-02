import {freeze, setPrototypeOf} from './helpers.js';

export const GlobalScope =
	(typeof self === 'object' && self && self.self) ||
	(typeof global === 'object' && global && global.global) ||
	(() => (1, eval)('this'))();

const globals = (({eval: $eval}) => ({
	eval: $eval,
}))(GlobalScope);

const scope = freeze(setPrototypeOf({...globals}, GlobalScope));

const locals = {};

export const ModuleScope = new Proxy(scope, {
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
