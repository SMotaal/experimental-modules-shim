/**
 * Tests for DynamicModule:
 * 	- Level 0 - Scoping
 * 	- Level 1 - Direct Exports
 * 	- Level 2 - Direct Imports
 * 	- Level 3 - Indirect Exports
 * 	- Level 4 - Circular References
 *
 * @author Saleh Abdel Motaal
 */
(async (debugging = ['meta.source']) => {
	const {
		ModuleScope,
		DynamicModule,
		setup = {},
		setup: {
			SPECS = !(
				(typeof process === 'object' &&
					process.argv &&
					(process.argv.includes('--compiler') || process.argv.includes('--nodes'))) ||
				(typeof location === 'object' && /\bcompiler\b|\bnodes\b/.test(location.search))
			),
			SCOPES = SPECS,
			GLOBALS = true,
			CYCLES = 0,
			LEVEL = SPECS ? 3 : 3,
			DELAY = 0,
		} = setup,
	} = globals().DynamicModules;

	/// ESX Modules Experiment
	Modules: {
		new DynamicModule(
			'level-0/module',
			module =>
				void (() => {
					// TODO: Fix last line comment terminator issue
					// /* module */
				}),
			ModuleScope,
		);

		LEVEL >= 0 &&
			new DynamicModule(
				'level-0/module-text',
				module =>
					void (() => {
						// Line comment
						/* Block comment */
						'string';
						`template ${'string'}`;
						/(regular)[…](expression)/;

						module.export` //
						{}`;
						module.export`async function *x() {}`;
						module.export`class X extends Object {}`;

						/*/export/*/ const x = 1;
						module.export.default = function y() {};
						module.import`'level-0/module-text'`;
					}),
				ModuleScope,
			) &&
			SCOPES &&
			new DynamicModule(
				'level-0/module-scope',
				module =>
					void (() => {
						let temp;
						const LOCAL_CONSTANT = 1;
						const NotAnError = Object.defineProperties(Error('Not an Error!'), {stack: {value: ''}});
						module.await = test(
							() => ({this: this, arguments: arguments}),
							() => _an_undefined_variable_,
							() => document,
							() => (_an_undefined_variable_ = 1),
							() => typeof _an_undefined_variable_,
							() => new Object({a: 1}),
							// NOTE: This threw proxy-related before node v12
							() => (([Object, temp = Object, Object] = [undefined, undefined, Object]), temp),
							() => LOCAL_CONSTANT === eval('LOCAL_CONSTANT'),
							() => typeof Object,
							() => Array(Object({a: String(1)})),
							() => new Array(new String('a'), new Number(2), Promise.resolve(NotAnError)),
							() => ['a', 2, NotAnError],
							() => new Promise(setTimeout),
						);
					}),
				ModuleScope,
			);

		GLOBALS &&
			LEVEL >= 1 &&
			new DynamicModule(
				'level-1/globals',
				module =>
					void (() => {
						// TODO: Throw when exported name is not a local binding
						module.export`{ Object, Array }`;
						// let {Object, Array} = globalThis;
						module.export.default = globalThis;
					}),
				ModuleScope,
			) &&
			LEVEL >= 2 &&
			new DynamicModule(
				'level-2/globals',
				module =>
					void (() => {
						module.import`global from '../level-1/globals'`;
						module.import`{Object, Array} from '../level-1/globals'`;
						module.import`* as global_namespace from '../level-1/globals'`;
						module.await(test(() => [Object, global.Object], () => global_namespace.default));
					}),
				ModuleScope,
			);

		LEVEL >= 1 &&
			new DynamicModule(
				'level-1/direct-exports',
				module =>
					void (() => {
						module.export`{ q, TWO, y, g1, g2, g3, G1 }`;
						const defaults = new (class Defaults {})();
						var q;
						const TWO = 2;
						let {y = {}} = defaults;
						function g1() {}
						async function g2() {}
						function* g3() {}
						class G1 {}
						module.export.default = defaults;
					}),
				ModuleScope,
			) &&
			LEVEL >= 2 &&
			new DynamicModule(
				'level-2/direct-imports',
				module =>
					void (() => {
						module.import`direct_exports_default from '../level-1/direct-exports'`;
						module.import`* as direct_exports from '../level-1/direct-exports'`;
						module.import`{g1, g2} from '../level-1/direct-exports'`;
						module.export`{ $g1, g2 as $g2 }`;
						const $g1 = g1;
						module.export.default = {g1, g2, direct_exports_default, direct_exports};
					}),
				ModuleScope,
			);

		LEVEL >= 3 &&
			new DynamicModule(
				'level-3/indirect-exports',
				module =>
					void (() => {
						module.export`{ g1 as export_g1, g2 as export_g2, default as export_direct_exports_default } from '../level-1/direct-exports'`;
						module.export`{default as export_direct_imports_default } from '../level-1/direct-exports'`;
						module.import`* as direct_exports from '../level-1/direct-exports'`;
						module.import`* as direct_imports from '../level-2/direct-imports'`;
						console.trace('indirect-exports');
						module.export.default = {direct_imports, direct_exports};
					}),
				ModuleScope,
			);

		// module.import`{a as aa} from './circular-aa'`;
		// module.import`{b} from './circular-b'`;
		// module.export`{ a, aa }`;
		// module.export.default = {a, b};

		LEVEL >= 4 &&
			new DynamicModule(
				'level-4/circular-a',
				module =>
					void (() => {
						// TODO: Implement new "bindings" layer
						module.export`{a as aa} from './circular-aa'`;
						module.export`{ a }`;
						let a = 1;
					}),
				ModuleScope,
			) &&
			new DynamicModule(
				'level-4/circular-aa',
				module =>
					void (() => {
						// TODO: Implement new "bindings" layer
						module.export`{a} from './circular-a'`;
					}),
				ModuleScope,
			) &&
			// new DynamicModule(
			// 	'level-4/circular-b',
			// 	module =>
			// 		void (() => {
			// 			module.import`{a} from './circular-a`;
			// 			module.export`{b, a}`;
			// 			let b = 1;
			// 			// module.export.default = {b, a};
			// 		}),
			// 	ModuleScope,
			// ) &&
			null;
	}

	Specs: {
		const {log, dir, error, group, groupEnd, time, timeEnd} = console;
		const consoleOptions = {
			mappings: new Map([[ModuleScope.globalThis, {[Symbol.toStringTag]: 'globalThis'}]]),
			compact: true,
		};
		const inNode = typeof process === 'object';

		const {toString} = {
			toString() {
				const {
					description = (this.description = `${Function.toString.call(this)}`
						.replace(/^[^]*?=>[\s\n]*([^]*)[\s\n]*$/, '$1')
						.replace(/^\(([^]*)\)$/, '$1')),
				} = this;
				return description;
			},
		};

		ModuleScope.test = async (ƒ, ...next) => {
			inNode || (ƒ.toString = toString);
			await (async () => await ƒ())()
				.then(result => () => dir(result, consoleOptions))
				.catch(reason => () => (inNode ? error(`${reason}`.split('\n', 1)[0]) : (reason.stack, error(reason))))
				.then(log => (inNode ? group('\n%s', ƒ) : group(ƒ), log(), groupEnd()));
			if (next.length) return ModuleScope.test(...next);
		};

		const cycles = (typeof CYCLES === 'number' && CYCLES > 1 && CYCLES) || 1;
		const delay = (typeof DELAY === 'number' && DELAY > 0 && DELAY) || 0;
		const ids = Object.keys(DynamicModule.map);
		const mark = `${ids.length} Modules`;

		delay && (await new Promise(resolve => setTimeout(resolve, delay)));

		if (!SPECS) {
			const {log, groupEnd, groupCollapsed, warn} = console.internal || console;

			groupCollapsed(`${ids.length} Modules`);
			for (const id of ids) {
				try {
					await DynamicModule.import(id);
					log(id);
				} catch (exception) {
					warn(id, exception);
				}
			}
			groupEnd();
			return;
		}

		const namespaces = new Set();

		for (let n = cycles, k = ids.concat([...ids].reverse()); --n; ids.push(...k));

		group(mark);
		(({lib, mode, source} = {}) =>
			console.warn(`Dynamic Modules «${[lib, source, mode].filter(Boolean).join(' - ') || 'unknown'}»`))(setup);
		time(mark);

		const Indent = /(?:^|\n)([ \t]+)/;
		const reindent = (source, newIndent = '') => {
			source = `${source}`.replace(/^\t/gm, '  ');
			const [, currentIndent] = Indent.exec(source) || '';
			return currentIndent ? source.replace(new RegExp(`^${currentIndent}`, 'mg'), newIndent) : source;
		};

		for (const id of ids) {
			let module, evaluator, sourceText, compiledText, moduleURL, namespace;
			const mark = `Import "${id}"`;

			inNode && log();
			group(mark);
			try {
				module = {
					evaluator,
					evaluator: {sourceText, compiledText, moduleURL},
				} = DynamicModule.map[id];
				moduleURL && log('module-url: ', `${moduleURL}`);
				sourceText && log('source-text: \n', reindent(`${sourceText}`, '\t'));
				compiledText && log('compiled-text: \n', reindent(`${compiledText}`, '\t'));
				time(mark);
				namespace = await DynamicModule.import(id);
				timeEnd(mark);
			} catch (exception) {
				error(exception);
			} finally {
				if (namespace) {
					if (namespaces.has(namespace)) continue;
					namespaces.add(namespace);
				}
				dir({Module: module, Namespace: namespace, Exports: {...namespace}}, consoleOptions);
				groupEnd();
				inNode && log();
			}

			// 	const mark = `Import "${id}"`;
			// 	group(mark);

			// 	try {
			// 		const module = DynamicModule.map[id];
			// 		const {evaluator} = module;
			// 		const {sourceText, compiledText, moduleURL} = evaluator;
			// 		moduleURL && log('module-url: ', `${moduleURL}`);
			// 		sourceText && log('source-text: \n', reindent(`${sourceText}`, '\t'));
			// 		compiledText && log('compiled-text: \n', reindent(`${compiledText}`, '\t'));
			// 		time(mark);
			// 		const namespace = await DynamicModule.import(id);
			// 		timeEnd(mark);
			// 		if (namespaces.has(namespace)) continue;
			// 		namespaces.add(namespace);
			// 		dir({Module: module, Namespace: namespace, Exports: {...namespace}}, consoleOptions);
			// 	} catch (exception) {
			// 		error(exception);
			// 	} finally {
			// 		groupEnd();
			// 	}
		}
		timeEnd(mark);
		groupEnd();
	}
})();

function globals(properties) {
	const global = globals.global || (globals.global = (1, eval)('this'));
	if (properties) for (const k in properties) global[k] = properties[k];
	return global;
}
