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
		await DynamicModules.ready;
	}
	import('./modules.spec.js');
})(
	(typeof self === 'object' && self && self.self === self && self) ||
		(typeof global === 'object' && global && global.global === global && global) ||
		undefined,
);
