import dynamicImport from './dynamicImport.mjs';
(async global => {
	const {DynamicModules = (global.DynamicModules = {})} = global;
	if (!DynamicModules.ready) {
		const {mode} = DynamicModules;
		try {
			DynamicModules.mode = 'ESM';
			if (typeof requestAnimationFrame === 'function') {
				await new Promise(resolve => requestAnimationFrame(resolve));
				await dynamicImport('./bootstrap.js');
				await new Promise(resolve => requestAnimationFrame(resolve));
			} else {
				await dynamicImport('./bootstrap.js');
			}
			// debugger;
			await DynamicModules.ready;
			// if (typeof safari === 'object') {
			// 	// console.log(await dynamicImport('./bootstrap.mjs'));
			// 	await (await import('./bootstrap.mjs')).default;
			// } else {
			// 	// console.log(await dynamicImport('./bootstrap.js'));
			// 	await dynamicImport('./bootstrap.js');
			// 	await DynamicModules.ready;
			// }
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
})(
	(1, eval)('this'),
	// (typeof self === 'object' && self && self.self === self && self) ||
	// 	(typeof global === 'object' && global && global.global === global && global) ||
	// 	undefined,
);
