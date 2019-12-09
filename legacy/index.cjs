#!/usr/bin/env node

(async global => {
  const {DynamicModules = (global.DynamicModules = {})} = global;
  if (!DynamicModules.ready) {
    const {mode} = DynamicModules;
    try {
      DynamicModules.mode = 'CJS';
      // await import('./bootstrap.js').ready;
      await require('./bootstrap.cjs').ready;
    } catch (exception) {
      exception.stack;
      DynamicModules.mode = mode;
      throw exception;
    }
  } else {
    console.warn(`Skipped reinitializing dynamic modules (initialized mode = ${DynamicModules.mode || 'unknown'})`);
    await DynamicModules.ready;
  }
  // TODO: Fix require/import for modules.spec
  // require('./modules.spec.cjs');
  import('../modules.spec.js');
})(
  (1, eval)('this'),
  // (typeof self === 'object' && self && self.self === self && self) ||
  // 	(typeof global === 'object' && global && global.global === global && global) ||
  // 	undefined,
);
