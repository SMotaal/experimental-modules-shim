const Separator = /[\s\n]*,[\s\n]*/;
const Exports = /`export *{([^}`;\*]*)}`/gm;
const Mappings = /([^\s,]+)(?: +as +([^\s,]+))?/g;

const evaluate = code => (1, eval)(code);

const wrap = source => `
(async (module, exports) => {
  with(module.scope) {
    (function (module, exports) {
      "use strict";
      module.meta.source = ${JSON.stringify(source)};
      ${source || ''}
    })(module, exports);
  }
})
`;

const rewrite = source =>
  source.replace(Exports, (match, mappings) => {
    let bindings = [];
    while ((match = Mappings.exec(mappings))) {
      const [, identifier, binding] = match;
      bindings.push(`${binding || '()'} => ${identifier}`);
    }
    return (bindings.length && `exports(${bindings.join(', ')})`) || '';
  });

const parseFunction = source =>
  (typeof source === 'function' &&
    /^\(module, exports\) *=> *{([^]*)}$|/.exec(`${source}`.trim())[1]) ||
  '';

const createEvaluator = ƒ => evaluate(wrap(rewrite(parseFunction(ƒ))));

export const test = () =>
  console.log(
    createEvaluator((module, exports) => {
      `export { q, TWO, y, g1, g2, g3, G1 }`;

      const defaults = new class Defaults {}();

      maybe(() => (Object = 1));
      maybe(() => (q = this));

      var q;
      const TWO = 2;
      let {y = {}} = defaults;
      function g1() {}
      async function g2() {}
      function* g3() {}
      class G1 {}

      exports.default(defaults);
    }),
  );

export default createEvaluator;
