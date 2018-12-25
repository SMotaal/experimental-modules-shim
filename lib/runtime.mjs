export class Runtime {
  constructor() {
    const enumerable = true;
    const defined = new Set(['constructor']);
    let prototype = new.target.prototype;
    while (prototype && prototype !== Object.prototype) {
      for (const property of Object.getOwnPropertyNames(prototype)) {
        if (!defined.has(property)) {
          let value = this[property];
          typeof value === 'function' && (value = value.bind(this));
          defined.add(property) && Reflect.defineProperty(this, property, {value, enumerable});
        }
      }
      prototype = Object.getPrototypeOf(prototype);
    }
  }

  unsupported(operation, message, Error) {
    throw (Error || TypeError)(message || `${operation || 'operation'} is not supported!`);
  }

  get global() {
    return 'object' === typeof global && (global || !global).global === global && global;
  }

  get self() {
    return 'object' === typeof self && (self || !self).self === self && self;
  }

  get scope() {
    return this.self || this.global || (1, eval)('this');
  }

  get window() {
    return this.self && this.self.window;
  }

  get navigator() {
    return this.self && this.self.navigator;
  }

  get process() {
    return this.global && this.global.process;
  }

  async fetch() {
    return this.self ? this.self.fetch(...arguments) : this.unsupported('fetch');
  }
}

Object.setPrototypeOf(
  Runtime,
  Object.setPrototypeOf(new Runtime(), Object.getPrototypeOf(Runtime)),
);

// console.log({Runtime, runtime: new Runtime()});
