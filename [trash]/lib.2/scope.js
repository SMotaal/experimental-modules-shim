import {freeze, setPrototypeOf} from './helpers.js';
import {Module} from './module.js';

export const GlobalScope =
  (typeof self === 'object' && self && self.self) ||
  (typeof global === 'object' && global && global.global) ||
  (() => (1, eval)('this'))();

const globals = (({eval: $eval}) => ({
  eval: $eval,
  Module,
}))(GlobalScope);

const scope = freeze(setPrototypeOf({...globals}, GlobalScope));

const locals = {};

export const ModuleScope = new Proxy(scope, {
  get: (target, property, receiver) => {
    if (property in globals) return globals[property];
    const value =
      property in GlobalScope && typeof property === 'string' ? GlobalScope[property] : undefined;
    if (value && typeof value === 'function') {
      const local = locals[property];
      const {proxy} =
        (local && local.value === value && local) ||
        (locals[property] = {
          value,
          proxy: new Proxy(value, {
            construct: (constructor, argArray, newTarget) =>
              Reflect.construct(value, argArray, newTarget),
            apply: (method, thisArg, argArray) =>
              thisArg == null || thisArg === receiver
                ? value(...argArray)
                : Reflect.apply(value, thisArg, argArray),
          }),
        });
      return proxy;
    }
    return value;
  },
  set: (globals, property) => {
    throw ReferenceError(`${property} is not defined`);
  },
});
