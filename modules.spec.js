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
						const test = ƒ =>
							(async () => await ƒ())()
								.then(result => () => log(result))
								.catch(reason => () => warn(`${reason}`.split('\n', 1)[0]))
								.then(log => group(format, ƒ) || log() || groupEnd());
						test(ƒ => ({this: this, arguments: arguments}));
						test(ƒ => _an_undefined_variable_);
						test(ƒ => (_an_undefined_variable_ = 1));
						test(ƒ => new Object({a: 1}));
						// This ones causes a Proxy/inspect related error for some reason
						test(ƒ => (Object = 1));
						test(ƒ => Array(Object({a: String(1)})));
						test(
							ƒ =>
								new Array(new String('a'), new Number(2), new Promise(resolve => resolve(new Error('Not an Error!')))),
						);
						test(ƒ => new Promise(resolve => setTimeout(resolve)));
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
	const mark = `Done: ${ids.length} Modules`;
	const namespaces = new Set();

	const {log, dir, error, group, groupEnd, time, timeEnd} = console;

	for (let n = cycles, k = ids.concat([...ids].reverse()); --n; ids.push(...k));

	delay && (await new Promise(resolve => setTimeout(resolve, delay)));

	time(mark);
	for (const id of ids) {
		group(`Import "${id}"`);
		try {
			const module = Module.map[id];
			const namespace = await Module.import(id);
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
})();

function globals(properties) {
	const global = globals.global || (globals.global = (1, eval)('this'));
	if (properties) for (const k in properties) global[k] = properties[k];
	return global;
}
