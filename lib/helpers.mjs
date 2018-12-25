export const {defineProperty, getOwnPropertyDescriptor} = Reflect;
export const {create, freeze, setPrototypeOf} = Object;

export const noop = () => {};

export const define = (target, property, value, enumerable = false, configurable = false) =>
  defineProperty(target, property, {value, enumerable, configurable}) && value;

export const bind = (target, property, get, enumerable = false, configurable = false) =>
  defineProperty(target, property, {get, set: noop, configurable, enumerable});

export const copy = (target, source, identifier, alias = identifier) =>
  defineProperty(target, alias, getOwnPropertyDescriptor(source, identifier));

export const ResolvedPromise = Promise.resolve();
