const Exports = /`export *{([^}`;\*]*)}`/gm;
const Mappings = /([^\s,]+)(?: +as +([^\s,]+))?/g;

const evaluate = code => (1, eval)(code);

const wrap = source => `
(async (module, exports) => {
  module.meta.source = ${JSON.stringify(source)};
  with(module.scope) (function () {
    "use strict";
    ${source}
  })();
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

export {createEvaluator};
