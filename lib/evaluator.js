import {Exports, Mappings, Indent, BindingDeclarations} from './expressions.js';
import {freeze} from './helpers.js';
import {compileFunction} from './compiler/compiler.js';

const evaluate = code => (1, eval)(code);

const wrap = (code, source, url, indent = '    ') => `
(function* (module, exports) {
  with(module.scope) (function () {
    "use strict";
${code}${url ? `\n\n${indent}//# sourceURL=${`${new URL(url, 'file:///')}`.replace(/^file:/i, 'virtual:')}` : ''}
  })(void (
		module.debug('module-url', module.meta.url),
		module.debug('compiled-text', ${JSON.stringify(`\n${code}`)}),
		module.debug('source-text', ${JSON.stringify(`\n${reindent(source, indent)}`)})
	));
})
`;

const reindent = (source, newIndent = '') => {
	source = `${source}`.replace(/^\t/gm, '  ');
	const [, currentIndent] = Indent.exec(source) || '';
	return currentIndent ? source.replace(new RegExp(`^${currentIndent}`, 'mg'), newIndent) : source;
};

const rewrite = source =>
	`${source}`.replace(Exports, (match, mappings) => {
		let bindings = [];
		while ((match = Mappings.exec(mappings))) {
			const [, identifier, binding] = match;
			bindings.push(`${binding || '()'} => ${identifier}`);
		}
		return (bindings.length && `exports(${bindings.join(', ')})`) || '';
	});

class CompiledModuleEvaluator {
	toString() {
		return this.sourceText;
	}
}

export const ModuleEvaluator = ({
	source,
	// sourceText = (typeof source === 'function' && compileFunction(source)) || source,
	sourceText = `${source}`,
	url,
	compiledText = rewrite(typeof source === 'function' ? compileFunction(source) : sourceText),
}) => {
	let match;
	const evaluator = evaluate(wrap(compiledText, sourceText, url));
	const links = (evaluator.links = {});

	while ((match = BindingDeclarations.exec(compiledText))) {
		const [, intent, bindings, binding, , specifier] = match;
		const mappings = (
			(binding && ((binding.startsWith('* ') && binding) || `default as ${binding}`)) ||
			bindings ||
			''
		).split(/ *, */g);
		while ((match = Mappings.exec(mappings))) {
			const [, identifier, binding = identifier] = match;
			freeze((links[binding] = {intent, specifier, identifier, binding}));
		}
	}

	freeze(links);

	return evaluator;
};
