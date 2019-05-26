((global, module, require) => {
	const {process, DynamicModules = (global.DynamicModules = (module && module.exports) || {})} = global;

	const mode =
		DynamicModules.mode || (process && module && require && typeof module.exports === 'object' ? 'CJS' : 'ESM');

	if (DynamicModules.ready) {
		throw Error(`Cannot reinitialize dynamic modules`);
	}

	module && module.exports && (module.exports = DynamicModules);

	{
		const sources = {
			DEV: {ESM: './lib/modules.js'},
			DIST: {CJS: './dist/modules.js', ESM: './dist/modules.mjs'},
		};

		const source = (process
		? process.argv && process.argv.find(arg => /^--dev$|^-d$/i.test(arg))
		: typeof location === 'object' && location && /[?&]dev\b/i.test(location.search))
			? 'DEV'
			: 'DIST';

		const lib = sources[source] && sources[source][mode];
		const specs = './modules.spec.js';

		if (!lib) {
			console.error('Cannot find a suitable %O source in %O format', source, mode);
			process && process.exit(1);
			return;
		}

		DynamicModules.ready = (async () => {
			// console.log(await importModule(lib));
			mode === 'CJS'
				? require(lib)
				: global.dynamicImport
				? await global.dynamicImport(lib)
				: await (1, eval)(`specifier => import(specifier)`)(lib);
			const {setup = (DynamicModules.setup = {})} = DynamicModules;
			Object.assign(setup, {lib, source, mode});
			return DynamicModules;
		})();
	}
})(
	(typeof globalThis === 'object' && globalThis) || (1, eval)('this'),
	(typeof module === 'object' && module) || undefined,
	(typeof require === 'function' && require) || undefined,
);
