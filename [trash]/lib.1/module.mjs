import {ModuleNamespaces} from './namespaces.mjs';
import {ModuleEvaluator} from './evaluator.mjs';
import {ModuleStrapper} from './strapper.mjs';
import {create, define, freeze, setPrototypeOf} from './helpers.mjs';

export class Module {
  constructor(url, evaluator, imports) {
    const enumerable = false;
    define(this, 'url', url, enumerable);
    define(this, 'evaluator', ModuleEvaluator(evaluator), enumerable);
    define(this, 'context', create(null, contextuals), enumerable, false);
    define(this, 'bindings', create(null), enumerable);
    define(this, 'links', Module.links(imports || `${evaluator}`, url), enumerable, false);
    this.namespaces || define(new.target.prototype, 'namespaces', new ModuleNamespaces(), false);
    Module.map[url] = this;
  }

  link() {
    const promise = Module.link(this);
    define(this, 'link', () => promise);
    return promise;
  }

  instantiate() {
    const instance = this.instance || Module.instantiate(this);
    const promise = this.link().then(() => instance);
    define(this, 'instantiate', () => promise);
    return promise;
  }

  evaluate() {
    const promise = Module.evaluate(this).then(() => this.namespace);
    define(this, 'evaluate', () => promise);
    return promise;
  }
}

/** Properties injected into every module context */
const contextuals = {};

Module.debugging = (() => {
  const debug = (type, ...args) => {
    console.log(type, ...args);
    // type in debugging && debugging[type] null, args);
  };
  const debugging = (debug.debugging = {});
  contextuals.debug = {value: freeze(debug)};
  return debugging;
})();

setPrototypeOf(Module, new ModuleStrapper());
