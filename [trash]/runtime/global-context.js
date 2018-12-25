/// <reference path="./globals.js" />
/// <reference path="./scope-handler.js" />

class GlobalContext {
  constructor(target, globals) {
    this.target = target;
    this.handler = new ScopeHandler();
    !globals ||
      typeof globals !== 'object' ||
      (this.handler.globals = new Globals(globals, this.target));
    const {proxy: context, revoke} = Proxy.revocable(this.target, this.handler);
    this.context = context;
    this.dispose = revoke;
  }
}

Object.setPrototypeOf(GlobalContext.prototype, null);
