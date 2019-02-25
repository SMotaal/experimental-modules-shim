/**
 * This file creates new Module(…) inside the global ModuleScope scope.
 * It is used for quickly testing the binding scope sub-system indenendently.
 *
 * @author Saleh Abdel Motaal
 */

(async (debugging = ['meta.source']) => {
	const {
		LEVEL = 3,
		CYCLES = 0,
		DELAY = 1000,
		DynamicModules: {ModuleScope, Module},
	} = globals();

	{
		/// ESX Modules Experiment
		Modules: {
			LEVEL >= 0 &&
				new Module(
					'level-0/module-scope',
					(module, exports) => {
						const {log, warn, group, groupEnd} = console;
						const node = typeof process === 'object';
						const format = (node && '%s') || '';
						const test = (ƒ, description) => (
							(description = `${Function.toString.call(ƒ)}`
								.replace(/^[^]*?=>[\s\n]*([^]*)[\s\n]*$/, '$1')
								.replace(/^\(([^]*)\)$/, '$1')),
							(ƒ.toString = () => description),
							(async () => await ƒ())()
								.then(result => () => log(result))
								.catch(reason => () => warn(`${reason}`.split('\n', 1)[0]))
								.then(log => group(format, ƒ) || log() || groupEnd())
						);
						test(() => ({this: this, arguments: arguments}));
						test(() => _an_undefined_variable_);
						test(() => (_an_undefined_variable_ = 1));
						test(() => typeof _an_undefined_variable_);
						test(() => new Object({a: 1}));
						// This ones causes a Proxy/inspect related error for some reason
						test(() => (Object = 1));
						test(() => typeof Object);
						test(() => Array(Object({a: String(1)})));
						test(() => new Array(new String('a'), new Number(2), Promise.resolve(Error('Not an Error!'))));
						test(() => new Promise(resolve => setTimeout(resolve)));
					},
					ModuleScope,
				);

			LEVEL >= 1 &&
				new Module(
					'level-1/direct-exports',
					(module, exports) => {
						`export { q, TWO, y, g1, g2, g3, G1 }`;
						const defaults = new class Defaults {}();
						var q;
						const TWO = 2;
						let {y = {}} = defaults;
						function g1() {}
						async function g2() {}
						function* g3() {}
						class G1 {}
						exports.default = defaults;
					},
					ModuleScope,
				);

			LEVEL >= 2 &&
				new Module(
					'level-2/direct-imports',
					(module, exports) => {
						`import direct_exports_default from '../level-1/direct-exports'`;
						`import * as direct_exports from '../level-1/direct-exports'`;
						`import {g1, g2} from '../level-1/direct-exports'`;
						`export { $g1, g2 as $g2 }`;
						const $g1 = g1;
						exports.default = {g1, g2, direct_exports_default, direct_exports};
					},
					ModuleScope,
				);

			LEVEL >= 2 &&
				new Module(
					'level-2/indirect-exports',
					(module, exports) => {
						`export { g1 as export_g1, g2 as export_g2, default as export_direct_exports_default } from '../level-1/direct-exports'`;
						`export {default as export_direct_imports_default } from '../level-1/direct-exports'`;
						`import * as direct_exports from '../level-1/direct-exports'`;
						`import * as direct_imports from './direct-imports'`;
						console.trace('indirect-exports');
						exports.default = {direct_imports, direct_exports};
					},
					ModuleScope,
				);
		}
	}

	const cycles = (typeof CYCLES === 'number' && CYCLES > 1 && CYCLES) || 1;
	const delay = (typeof DELAY === 'number' && DELAY > 0 && DELAY) || 0;

	const ids = Object.keys(Module.map);
	const mark = `${ids.length} Modules`;
	const namespaces = new Set();

	const {log, dir, error, group, groupEnd, time, timeEnd} = console;

	for (let n = cycles, k = ids.concat([...ids].reverse()); --n; ids.push(...k));

	delay && (await new Promise(resolve => setTimeout(resolve, delay)));

	group(mark);
	time(mark);
	for (const id of ids) {
		const mark = `Import "${id}"`;
		group(mark);
		try {
			const module = Module.map[id];
			time(mark);
			const namespace = await Module.import(id);
			timeEnd(mark);
			if (namespaces.has(namespace)) continue;
			namespaces.add(namespace);
			dir({Module: module, Namespace: namespace, Exports: {...namespace}});
		} catch (exception) {
			error(exception);
		} finally {
			groupEnd();
		}
	}
	timeEnd(mark);
	groupEnd();
})();

function globals(properties) {
	const global = globals.global || (globals.global = (1, eval)('this'));
	if (properties) for (const k in properties) global[k] = properties[k];
	return global;
}
