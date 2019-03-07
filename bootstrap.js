((global, module, require) => {
	const {process, DynamicModules = (global.DynamicModules = (module && module.exports) || {})} = global;

	const mode =
    DynamicModules.mode || (process && module && require && typeof module.exports === 'object' ? 'CJS' : 'ESM');

  if (DynamicModules.ready) {
    throw Error(`Cannot reinitialize dynamic modules`);
  }

	const importModule = mode === 'CJS' ? require : async specifier => import(specifier);

	module && module.exports && (module.exports = DynamicModules);

	{
		const sources = {
			DEV: {ESM: './lib/modules.js'},
			DIST: {CJS: './dist/modules.js', ESM: './dist/modules.mjs'},
		};

		const source = (process
		? process.argv && process.argv.find(arg => /^--dev$|^-d$/i.test(arg))
		: typeof location === 'object' && location && /[?&]dev/i.test(location.search))
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
			await importModule(lib);
			// mode === 'CJS' && (await new Promise(resolve => setTimeout(resolve, 100)));
			const {meta = (DynamicModules.meta = {})} = DynamicModules;
			Object.assign(meta, {lib, source, mode});
			return DynamicModules;
		})();
	}
})(
	(typeof self === 'object' && self && self.self === self && self) ||
		(typeof global === 'object' && global && global.global === global && global) ||
		undefined,
	(typeof module === 'object' && module) || undefined,
	(typeof require === 'function' && require) || undefined,
);
