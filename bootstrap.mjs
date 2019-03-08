import dynamicImport from './dynamicImport.mjs';

export default (async global => {
	const {DynamicModules = (global.DynamicModules = {})} = global;
	// typeof safari === 'object' && (await new Promise(resolve => setTimeout(resolve, 1000)));
	// typeof safari === 'object' && (await new Promise(resolve => requestAnimationFrame(resolve)));
	// await import('./bootstrap.js');
	if (typeof safari === 'object') {
		await new Promise(resolve => requestAnimationFrame(resolve));
		await dynamicImport('./bootstrap.js');
		await new Promise(resolve => requestAnimationFrame(resolve));
	} else {
		await dynamicImport('./bootstrap.js');
	}
	return await DynamicModules.ready;
})(
	(1, eval)('this')
	// (typeof self === 'object' && self && self.self === self && self) ||
	// 	(typeof global === 'object' && global && global.global === global && global) ||
	// 	undefined,
);
