class ScopeHandler {
  get(target, property, receiver, value, local) {
    if (this.globals && property in this.globals) return this.globals[property];
    value = property in target && typeof property === 'string' ? target[property] : undefined;
    if (value && typeof value === 'function') {
      local = (this.locals || (this.locals = {}))[property];
      return local && local.value === value
        ? local.proxy
        : (this.locals[property] = {
            value,
            proxy: new Proxy(value, {
              apply: (method, thisArg, argArray) =>
                Reflect.apply(method, (target === receiver && target) || thisArg),
            }),
          }).proxy;
    }
    return value;
  }
  set(target, property) {
    throw ReferenceError(`${property} is not defined`);
  }
}

Object.setPrototypeOf(ScopeHandler.prototype, null);

// function ScopeHandler() {
//   const {apply} = Reflect;
//   ScopeHandler =
//   return new.target ? new ScopeHandler(...arguments) : ScopeHandler(...arguments);
// }
