#!/usr/bin/env node --experimental-modules

console.clear();

const useDist =
  import.meta.url.includes('#dist') ||
  (typeof process === 'object' && process && process.argv && process.argv.includes('--dist'));

(async () => {
  await import(useDist ? './dist/modules.mjs' : './lib/modules.mjs');
  await import('./modules.spec.js');
})();
