(async global => {
	await(await import('./bootstrap.mjs')).default;
	import('./modules.spec.js');
})((1, eval)(`(global => ((global.DynamicModules || (global.DynamicModules = {})).mode = "ESM", global))(this)`));
