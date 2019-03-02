import {Exports, Mappings, Indent} from './expressions.js';

const evaluate = code => (1, eval)(code);

const wrap = (code, source, url, indent = '    ') => `
(function* (module, exports) {
  module.debug('module-url', module.meta.url);
  module.debug('compiled-text', ${JSON.stringify((code = reindent(code, indent)))});
  module.debug('source-text', ${JSON.stringify(reindent(source, indent))});
  with(module.scope) (function () {
    "use strict";
${code}${url ? `\n\n${indent}//# sourceURL=${`${new URL(url, 'file:///')}`.replace(/^file:/i, 'virtual:')}` : ''}
  })();
})
`;

const reindent = (source, newIndent = '') => {
	source = source.replace(/^\t/gm, '  ');
	const [, currentIndent] = Indent.exec(source) || '';
	return currentIndent ? source.replace(new RegExp(`^${currentIndent}`, 'mg'), newIndent) : source;
};

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
	(typeof source === 'function' && /^\(module, exports\) *=> *{([^]*)}$|/.exec(`${source}`.trim())[1]) || '';

class CompiledModuleEvaluator {
	toString() {
		return this.sourceText;
	}
}

export const ModuleEvaluator = ({
	source,
	sourceText = (typeof source === 'function' && parseFunction(source)) || source,
	url,
	compiledText = rewrite(sourceText),
}) =>
	Object.setPrototypeOf(
		Object.defineProperties(evaluate(wrap(compiledText, sourceText, url)), {
			sourceText: {value: sourceText, enumerable: true},
			compiledText: {value: compiledText, enumerable: true},
			url: {value: url, enumerable: true},
		}),
		CompiledModuleEvaluator,
	);
