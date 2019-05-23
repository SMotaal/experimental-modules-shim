import {DynamicModule} from './dynamic-module.js';
import {create, setProperty, bindProperty} from './helpers.js';

export class ModuleNamespaces {
	constructor() {
		setProperty(this, '[[imports]]', create(null), true);
	}
	import(url) {
		return (
			this[url] ||
			(this['[[imports]]'][url] ||
				(this['[[imports]]'][url] = DynamicModule.import(url)).then(
					namespace => (bindProperty(this, url, () => namespace, true, false), namespace),
				))
		);
		// 	setProperty(
		// 		this,
		// 		url,
		// 		(this['[[imports]]'][url] || (this['[[imports]]'][url] = DynamicModule.import(url))).then(
		// 			namespace => (bindProperty(this, url, () => namespace, true, false), namespace),
		// 		),
		// 		// (this['[[imports]]'][url] || (this['[[imports]]'][url] = DynamicModule.import(url))).then(
		// 		// 	namespace => (bindProperty(this, url, () => namespace, true, false), namespace),
		// 		// ),
		// 		true,
		// 		true,
		// 	)
		// );
	}
}
