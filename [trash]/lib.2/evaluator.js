import {Exports, Mappings} from './expressions.js';

const evaluate = code => (1, eval)(code);

const wrap = (body, source) => `
((module, exports) => {
  module.debug('module-url', module.meta.url);
  module.debug('body-text', ${JSON.stringify(body)});
  module.debug('source-text', ${JSON.stringify(source)});
  with(module.scope) (function () {
    "use strict";
    ${body}
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

export const ModuleEvaluator = (
  source,
  sourceText = (typeof source === 'function' && parseFunction(source)) || source,
) => evaluate(wrap(rewrite(sourceText), sourceText));
