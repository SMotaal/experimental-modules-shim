import dynamicImport from './dynamicImport.mjs';

(async global => {
	const {DynamicModules = (global.DynamicModules = {})} = global;

	if (!DynamicModules.ready) {
		const {mode} = DynamicModules;
		try {
			DynamicModules.mode = 'ESM';
			typeof requestAnimationFrame !== 'function' || (await new Promise(requestAnimationFrame));
			await (await dynamicImport('./bootstrap.js')).default;
			await DynamicModules.ready;
		} catch (exception) {
			exception.stack;
			DynamicModules.mode = mode;
			throw exception;
		}
	} else {
		console.warn(`Skipped reinitializing dynamic modules (initialized mode = ${DynamicModules.mode || 'unknown'})`);
		await DynamicModules.ready;
	}
	await dynamicImport('./modules.spec.js');
})((typeof globalThis === 'object' && globalThis) || (1, eval)('this'));
