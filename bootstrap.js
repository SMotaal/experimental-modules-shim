((global, module, require) => {
  const {process} = global;

  const mode = global.DynamicModules && global.DynamicModules.mode || (process && module && require && typeof module.exports === 'object'
    ? 'CJS' : 'ESM');

  // const importModule = global.importModule || (global.importModule = mode === 'CJS' ? require : async specifier => import(specifier));
  const importModule = mode === 'CJS' ? require : async specifier => import(specifier);

  {
    const sources = {
      DEV: {ESM: './lib/modules.js'},
      DIST: {CJS: './dist/modules.js', ESM: './dist/modules.mjs'},
    };

    const source = (process
    ? process.argv && process.argv.find(arg => /^--dev$|^-d$/i.test(arg))
    : typeof location === 'object' && location && /[?&]dev/i.test(location.search))
      ? 'DEV'
      : 'DIST';

    const lib = sources[source] && sources[source][mode];
    const specs = './modules.spec.js';

    if (!lib) {
      console.error('Cannot find a suitable %O source in %O format', source, mode);
      process && process.exit(1);
      return;
    }

    global['dynamic-modules'] = (async () => {
      await importModule(lib);
      mode === 'CJS' && await new Promise(resolve => setTimeout(resolve, 100));
      let na;
      const {DynamicModules, DynamicModules: {meta = DynamicModules.meta = {}}} = global;
      Object.assign(meta, {lib, source, mode});
      mode === 'CJS' && module && (module.exports = global.DynamicModules);
      return DynamicModules;
      // return DynamicModules;
      // console.clear();
      // console.log(`Running "${specs}" with "${lib}" — ${source} in ${mode}`);
    })();

    mode === 'CJS' && module && (module.exports = global['dynamic-modules']);
  }

})(
  (typeof self === 'object' && self && self.self === self && self) ||
  (typeof global === 'object' && global && global.global === global && global) ||
undefined, typeof module === 'object' && module || undefined, typeof require === 'function' && require || undefined)
