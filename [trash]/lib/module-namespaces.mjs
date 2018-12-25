import {define, bind} from './helpers.mjs';
import Module from './module.mjs';

export default class ModuleNamespaces {
  import(url) {
    return (
      this[url] ||
      define(this, url, Module.import(url).then(
        namespace => (bind(this, url, () => namespace, true, false), namespace),
      ), true, true)
    );
  }
}
