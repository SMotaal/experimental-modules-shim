import {Exports, Mappings, BindingDeclarations} from './expressions.js';
import {freeze} from './helpers.js';
import {compileFunction} from './compiler/compiler.js';

export const ModuleEvaluator = (() => {
	const evaluate = code => (1, eval)(code);

	const rewrite = source =>
		`${source}`.replace(Exports, (match, mappings) => {
			let bindings = [];
			while ((match = Mappings.exec(mappings))) {
				const [, identifier, binding] = match;
				bindings.push(`${binding || '()'} => ${identifier}`);
			}
			return (bindings.length && `exports(${bindings.join(', ')})`) || '';
		});

	return ({
		source,
		sourceText = `${source}`,
		url: moduleURL,
		compiledText = rewrite(typeof source === 'function' ? compileFunction(source) : sourceText),
	}) => {
		let match;
		const evaluator = evaluate(
			`(function* (module, exports) { with(module.scope) (function () { "use strict";\n${compiledText}${
				moduleURL ? `//# sourceURL=${`${new URL(moduleURL, 'file:///')}`.replace(/^file:/i, 'virtual:')}\n` : ''
			}})();})`,
		);
		evaluator.sourceText = sourceText;
		evaluator.compiledText = compiledText;
		evaluator.moduleURL = moduleURL;
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
})();
