import {freeze, setPrototypeOf} from './helpers.mjs';
import {Module} from './module.mjs';

export const GlobalScope =
  (typeof self === 'object' && self && self.self) ||
  (typeof global === 'object' && global && global.global) ||
  (() => (1, eval)('this'))();

const globals = (({eval: $eval}) => ({
  eval: $eval,
  Module,
}))(GlobalScope);

const scope = freeze(setPrototypeOf({...globals}, GlobalScope));

export const ModuleScope = new Proxy(scope, {
  get: (target, property, receiver) => {
    if (property in globals) return globals[property];
    const value =
      property in GlobalScope && typeof property === 'string' ? GlobalScope[property] : undefined;
    return value && typeof value === 'function'
      ? new Proxy(value, {
          construct: (constructor, argArray, newTarget) =>
            Reflect.construct(value, argArray, newTarget),
          apply: (method, thisArg, argArray) => thisArg === receiver
            ? value(...argArray)
            : Reflect.apply(value, thisArg, argArray),
        })
      : value;
  },
  set: (globals, property) => {
    throw ReferenceError(`${property} is not defined`);
  },
});
