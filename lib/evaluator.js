import {Exports, Mappings, BindingDeclarations} from './expressions.js';
import {freeze} from './helpers.js';
import {parseDynamicModuleEvaluator} from './compiler/compiler.js';

/** @type {(init: {source: Function | string, url: string}) => Evaluator} */
export const ModuleEvaluator = (() => {
	const evaluate = code => (1, eval)(code);

	const rewrite = source =>
		// TODO: Handle shadows and redudant exports!
		`${source}`.replace(Exports, (match, guard, mappings) => {
			const bindings = [];
			while ((match = Mappings.exec(mappings))) {
				let {1: identifier, 2: binding} = match;
				bindings.push(`${binding || '()'} => ${identifier}`);
			}
			return (bindings.length && `exports(${bindings.join(', ')})`) || '';
		});

	return ({
		source,
		sourceText = `${source}`,
		url: moduleURL,
		compiledText = rewrite(
			typeof source === 'function' ? parseDynamicModuleEvaluator(source).compiledEvaluatorText : sourceText,
		),
	}) => {
		let match;

		/** @type {Evaluator} */
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

/** @typedef {import('./types').modules.Module.Context} Context */
/** @typedef {import('./types').modules.Module.Exports} Exports */
/** @typedef {import('./types').modules.Module.Links} Links */
/** @typedef {import('./types').modules.DynamicModule.Evaluator} Evaluator */
