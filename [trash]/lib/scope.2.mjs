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
              !thisArg || thisArg === receiver
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

// return value && typeof value === 'function'
//   ? new Proxy(value, {
//       construct: (constructor, argArray, newTarget) =>
//         Reflect.construct(value, argArray, newTarget),
//       apply: (method, thisArg, argArray) => value(...argArray),
//     })
//   : value;

// has: (target, property) => property in globals || property in GlobalScope,

// const locals = {};
// const scope = GlobalScope;

// property in globals ? globals[property] : GlobalScope[property];

// freeze(setPrototypeOf({...globals}, GlobalScope));
// export const ModuleScope = new Proxy(freeze(setPrototypeOf({...globals}, GlobalScope)), {

// const local = (this.locals || (this.locals = {}))[property];
// return local && local.value === value
//   ? local.proxy
//   : (this.locals[property] = {
//       value,
//       proxy: function(...args) {
//         return new.target === receiver
//           ? new value(...args)
//           : new.target
//           ? Reflect.construct(value, args, new.target)
//           : this !== receiver
//           ? value.apply(this, args)
//           : value(...args);
//       },

//       // proxy: new Proxy(value, {
//       //   construct: (target, argArray, newTarget) =>
//       //     Reflect.construct(value, argArray, newTarget),
//       //   apply: (method, thisArg, argArray) => {
//       //     return value(...argArray);
//       //     // console.log({method, thisArg});
//       //     // return thisArg && thisArg !== receiver
//       //     //   ? Reflect.apply(value, thisArg, argArray)
//       //     //   : Reflect.apply(value, null, argArray);
//       //   }
//       // }),
//     }).proxy;
