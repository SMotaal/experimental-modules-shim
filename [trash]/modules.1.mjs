console.clear();

setTimeout(async () => {
  const LEVEL = 3;
  const CYCLES = 3;

  Bootstrap: {
    globals({maybe});
    globals({ModuleScope: (await import('../packages/modules.mjs')).default});
  }

  const Module = ModuleScope.Module;

  /// ESX Modules Experiment
  Modules: {
    LEVEL >= 0 &&
      new Module('level-0/module-scope', (module, exports) => {
        console.log(module.meta.source);
        maybe(() => (Object = 1));
        maybe(() => (_an_undefined_variable_ = 1));
        maybe(() => console.log(`this = %o`, this));
      });

    LEVEL >= 1 &&
      new Module('level-1/direct-exports', (module, exports) => {
        `export { q, TWO, y, g1, g2, g3, G1 }`;
        console.log(module.meta.source);
        const defaults = new class Defaults {}();
        var q;
        const TWO = 2;
        let {y = {}} = defaults;
        function g1() {}
        async function g2() {}
        function* g3() {}
        class G1 {}
        exports.default(defaults);
      });

    LEVEL >= 2 &&
      new Module('level-2/direct-imports', (module, exports) => {
        `import direct_exports_default from '../level-1/direct-exports'`;
        `import * as direct_exports from '../level-1/direct-exports'`;
        `import {g1, g2} from '../level-1/direct-exports'`;
        `export { $g1 }`;
        console.log(module.meta.source);
        const $g1 = g1;
        exports.default({g1, g2, direct_exports_default, direct_exports});
      });

    LEVEL >= 2 &&
      new Module('level-2/indirect-exports', (module, exports) => {
        `export {g1 as export_g1, g2 as export_g2, default as export_direct_exports_default } from '../level-1/direct-exports'`;
        `export {default as export_direct_imports_default } from '../level-1/direct-exports'`;
        `import * as direct_exports from '../level-1/direct-exports'`;
        `import * as direct_imports from './direct-imports'`;
        console.log(module.meta.source);
        console.trace('indirect-exports');
        exports.default({direct_imports, direct_exports});
      });
  }

  {
    const {log, dir, error, group, groupEnd} = console;
    const ids = Object.keys(Module.map);
    if (CYCLES) for (let n = CYCLES, k = ids.concat([...ids].reverse()); --n; ids.push(...k));
    const mark = `Done: ${ids.length} Modules`;
    const namespaces = new Set();
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.time(mark);
    for (const id of ids) {
      group(`Import "${id}"`);
      try {
        const module = Module.map[id];
        const namespace = await Module.import(id);
        if (namespaces.has(namespace)) continue;
        namespaces.add(namespace);
        dir({Module: module, Namespace: namespace, Exports: {...namespace}});
      } catch (exception) {
        error(exception);
      } finally {
        groupEnd();
      }
    }
    console.timeEnd(mark);
  }
});

function globals(globals) {
  if (!globals) return;
  const global = (1, eval)('this');
  for (const k in globals) global[k] = globals[k];
}

function maybe(ƒ) {
  try {
    ƒ();
  } catch (exception) {
    console.warn(restack(exception, /^(.*?\n)([^]*\bmaybe\b.*?\n)/));
  }
}

function restack(exception, replacer, replacement = '$1') {
  return Object.defineProperty(exception, 'stack', {
    value: exception.stack.replace(replacer, replacement),
  });
}

// typeof require === 'function' && require('./runtime/import-scripts.js');
