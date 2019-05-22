export const {
	bindProperty,
	copyProperty,
	create,
	entries,
	freeze,
	Reflect,
	ResolvedPromise,
	setProperty,
	setPrototypeOf,
} = (() => {
	const {
		Object: {create, entries, freeze, setPrototypeOf},
		Reflect: {set, apply, construct, defineProperty, getOwnPropertyDescriptor},
		Promise,
	} = globalThis;
	const noop = () => {};
	return {
		bindProperty: (target, property, get = noop, enumerable = false, configurable = false) =>
			defineProperty(target, property, {get, set: noop, configurable, enumerable}),
		copyProperty: (target, source, identifier, alias = identifier) =>
			defineProperty(target, alias, getOwnPropertyDescriptor(source, identifier)),
		create,
		entries: entries,
		freeze,
		noop,
		Reflect: freeze(setPrototypeOf({set, apply, construct, defineProperty, getOwnPropertyDescriptor}, null)),
		ResolvedPromise: Promise.resolve(),
		setProperty: (target, property, value, enumerable = false, configurable = false) =>
			defineProperty(target, property, {value, enumerable, configurable}) && value,
		setPrototypeOf,
	};
})();
