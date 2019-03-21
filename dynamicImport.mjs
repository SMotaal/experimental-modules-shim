import './dynamicImport.js';

export default (global => async (...args) =>
	((global.dynamicImport.then && (global.dynamicImport = await global.dynamicImport)) || global.dynamicImport)(
		...args,
	))((1, eval)('this'));

// dynamicImport;
