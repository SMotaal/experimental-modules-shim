import {ModuleNamespaces} from './namespaces.js';
import {ModuleEvaluator} from './evaluator.js';
import {ModuleStrapper} from './strapper.js';
import {createObject, setProperty, freeze, setPrototypeOf} from './helpers.js';

export class Module {
  constructor(url, evaluator, imports) {
    const enumerable = false;
    setProperty(this, 'url', url, enumerable);
    setProperty(this, 'evaluator', ModuleEvaluator(evaluator), enumerable);
    setProperty(this, 'context', createObject(null, contextuals), enumerable, false);
    setProperty(this, 'bindings', createObject(null), enumerable);
    setProperty(this, 'links', Module.links(imports || `${evaluator}`, url), enumerable, false);
    this.namespaces || setProperty(new.target.prototype, 'namespaces', new ModuleNamespaces(), false);
    Module.map[url] = this;
  }

  link() {
    const promise = Module.link(this);
    setProperty(this, 'link', () => promise);
    return promise;
  }

  instantiate() {
    const instance = this.instance || Module.instantiate(this);
    const promise = this.link().then(() => instance);
    setProperty(this, 'instantiate', () => promise);
    return promise;
  }

  evaluate() {
    const promise = Module.evaluate(this).then(() => this.namespace);
    setProperty(this, 'evaluate', () => promise);
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
