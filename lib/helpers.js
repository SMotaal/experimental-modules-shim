export const {defineProperty, getOwnPropertyDescriptor} = Reflect;
export const {create, freeze, setPrototypeOf} = Object;

export const noop = () => {};

export const setProperty = (target, property, value, enumerable = false, configurable = false) =>
	defineProperty(target, property, {value, enumerable, configurable}) && value;

export const bindProperty = (target, property, get, enumerable = false, configurable = false) =>
	defineProperty(target, property, {get, set: noop, configurable, enumerable});

export const copyProperty = (target, source, identifier, alias = identifier) =>
	defineProperty(target, alias, getOwnPropertyDescriptor(source, identifier));

export const ResolvedPromise = Promise.resolve();
