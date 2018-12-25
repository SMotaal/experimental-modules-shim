import {Module} from './module.mjs';

export const GlobalScope =
  (typeof self === 'object' && self && self.self) ||
  (typeof global === 'object' && global && global.global) ||
  (() => (1, eval)('this'))();

const globals = (({eval: $eval, Object}) =>
  Object.freeze({eval: $eval, Object, Module}, GlobalScope))(GlobalScope);

const UndefinedProperty = (target, property) => {
  throw ReferenceError(`${property} is not defined`);
};

export const ModuleScope = new Proxy(Object.freeze({...globals}), {
  get: (target, property, receiver) =>
    property in globals ? globals[property] : GlobalScope[property],
  set: UndefinedProperty,
});

// {
//   get: (target, property) => {
//     if (typeof property !== 'string' || property === 'arguments') return;
//     if (property in target) return target[property];
//     const value = GlobalScope[property];
//     return (value && typeof value === 'function' && value.bind(GlobalScope)) || value;
//   },
//   set: (target, property) => {
//     throw ReferenceError(`${property} is not defined`);
//   },
// }

// {
//   get: (target, property, receiver) => {
//     // if (this.globals && property in this.globals) return this.globals[property];
//     // value = property in target && typeof property === 'string' ? target[property] : undefined;
//     return property in globals ?  globals[property] : GlobalScope[property];
//     // if (typeof property !== 'string' || property === 'arguments') return;
//     // if (property in target) return target[property];
//     // const value = GlobalScope[property];
//     // if (value && typeof value === 'function') {
//     //   const local = locals[property];
//     //   return local && local.value === value
//     //     ? local.proxy
//     //     : (locals[property] = {
//     //         value,
//     //         proxy: new Proxy(value, {
//     //           apply: (method, thisArg, argArray, receiver) => {
//     //             return {method, thisArg, target, receiver};
//     //             // console.log(method, thisArg, target, receiver);
//     //             // return Reflect.apply(
//     //             //   method,
//     //             //   (thisArg && thisArg !== ModuleScope && thisArg) || GlobalScope,
//     //             // )
//     //           },
//     //         }),
//     //       }).proxy;
//     // }
//     // return value;
//   },
//   set: (target, property) => {
//     throw ReferenceError(`${property} is not defined`);
//   },
