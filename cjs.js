(async global => {
	await require('./bootstrap.js').ready;
	require('./modules.spec.js');
})((1, eval)(`(global => ((global.DynamicModules || (global.DynamicModules = {})).mode = "CJS", global))(this)`));
