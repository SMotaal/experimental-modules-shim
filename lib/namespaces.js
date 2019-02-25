import {Module} from './module.js';
import {setProperty, bindProperty} from './helpers.js';

export class ModuleNamespaces {
	import(url) {
		return (
			this[url] ||
			setProperty(
				this,
				url,
				Module.import(url).then(namespace => (bindProperty(this, url, () => namespace, true, false), namespace)),
				true,
				true,
			)
		);
	}
}