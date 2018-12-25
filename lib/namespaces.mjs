import {Module} from './module.mjs';
import {define, bind} from './helpers.mjs';

export class ModuleNamespaces {
  import(url) {
    return (
      this[url] ||
      define(this, url, Module.import(url).then(
        namespace => (bind(this, url, () => namespace, true, false), namespace),
      ), true, true)
    );
  }
}
