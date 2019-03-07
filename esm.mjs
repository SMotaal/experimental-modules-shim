(async global => {
	const {DynamicModules = (global.DynamicModules = {})} = global;
	if (!DynamicModules.ready) {
		const {mode} = DynamicModules;
		try {
			DynamicModules.mode = 'ESM';
			await (await import('./bootstrap.mjs')).default;
		} catch (exception) {
			exception.stack;
			DynamicModules.mode = mode;
			throw exception;
		}
	} else {
		console.warn(`Skipped reinitializing dynamic modules (initialized mode = ${DynamicModules.mode || 'unknown'})`);
		await DynamicModules.ready;
	}
	import('./modules.spec.js');
})(
	(1, eval)('this'),
	// (typeof self === 'object' && self && self.self === self && self) ||
	// 	(typeof global === 'object' && global && global.global === global && global) ||
	// 	undefined,
);
