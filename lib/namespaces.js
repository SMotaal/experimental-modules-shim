import {create, setProperty, bindProperty} from './helpers.js';

export class ModuleNamespaces {
	constructor(importHostModule) {
		setProperty(this, '[[importHostModule]]', importHostModule, true);
		setProperty(this, '[[imports]]', create(null), true);
		setProperty(
			this,
			'import',
			importHostModule
				? url =>
						this[url] ||
						(this['[[imports]]'][url] ||
							(this['[[imports]]'][url] = this['[[importHostModule]]'](url)).then(
								namespace => (bindProperty(this, url, () => namespace, true, false), namespace),
							))
				: this.import,
			true,
		);
	}
	import(url) {
		throw Error('Unsupported operation: [[importHostModule]] is undefined!');
	}
}
