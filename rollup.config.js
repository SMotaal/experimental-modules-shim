const dirname = __dirname;
const bundles = {
  modules: {
    input: `${dirname}/lib/modules.mjs`,
    output: {
      path: `${dirname}/dist`,
    },
  },
};

// prettier-ignore //
const bundle = (name, format = 'umd', filename = '', {output: {path, ...output} = {}, ...options} = bundles[name]) => {
  const [, dir, entry, extension] = /^(.*?)([^\/]*?)(\..*)$/.exec(filename);
  const file = `${dir || path || `${dirname}/dist`}/${entry || name}${extension || '.js'}`;
  return {
    ...defaults,
    ...options,
    output: {
      ...defaults.output,
      file,
      format,
      name,
      ...output,
    },
  };
};

const defaults = {
  context: 'this',
  output: {sourcemap: 'inline'},
};

export default [bundle('modules', 'es', '.mjs'), bundle('modules', 'iife', '.js')];
