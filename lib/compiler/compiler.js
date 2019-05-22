import {tokenizer} from '../../../markup/dist/tokenizer.es.js';

export const {compileModuleSourceText, compileFunction} = (() => {
	const compileBody = (bodyText, moduleSourceText) => {
		let indent, text, type, goal, group, contextId, lineNumber, columnNumber;
		const {
			fragments = (moduleSourceText.fragments = []),
			tokens = (moduleSourceText.tokens = []),
			bindings = (moduleSourceText.bindings = []),
		} = moduleSourceText;

		for (const token of tokenizer.tokenize(bodyText)) {
			if (!token || !token.text) continue;

			({
				text,
				type,
				goal: {name: goal},
				group,
				state: {
					tokenContext: {id: contextId},
				},
				lineNumber,
				columnNumber,
			} = token);

			tokens.push({contextId, type, text, lineNumber, columnNumber, goal, group});
			fragments.push(type !== 'inset' ? text : indent ? text.replace(indent, '\t') : ((indent = text), '\t'));
		}

		return moduleSourceText;
	};

	const compileModuleSourceText = (bodyText, moduleSourceText) => {
		compileBody(bodyText, moduleSourceText);
		moduleSourceText.compiledText = moduleSourceText.fragments.join('');
		return moduleSourceText;
	};

	const compileFunction = sourceText => {
		let bodyText;

		const {log, warn, group, groupCollapsed, groupEnd, table} = console.internal || console;

		[, bodyText = ''] = /^\s*module\s*=>\s*void\s*\(\s*\(\s*\)\s*=>\s*\{[ \t]*?\n?(.*)\s*\}\s*\)\s*;?\s*$/s.exec(
			sourceText,
		);

		bodyText &&
			(bodyText = bodyText
				.replace(/\bmodule\.import`/g, '`import ')
				.replace(/\bmodule\.export`/g, '`export ')
				.replace(/\bmodule\.await\s*\(/gs, 'module.await = (')
				.replace(/\bmodule\.export\.default\s*=/gs, 'exports.default ='));

		const moduleSourceText = new ModuleSourceText();
		const {tokens, compiledText} = compileModuleSourceText(bodyText, moduleSourceText);

		// groupCollapsed(bodyText);
		// table(tokens);
		// log(compiledText);
		// groupEnd();

		return moduleSourceText;
	};

	class ModuleSourceText {
		toString() {
			return this.compiledText;
		}
	}

	return {compileModuleSourceText, compileFunction};
})();

// const UNDEFINED = `${undefined}`;

// const intercepts = {
// 	[UNDEFINED]: ({text}) => text,
// };

// let intercept, text, type, goal, group, contextId, lineNumber, columnNumber;

// token &&
// 	({
// 		text,
// 		type,
// 		goal: {name: goal},
// 		group,
// 		state: {
// 			tokenContext: {id: contextId},
// 		},
// 		lineNumber,
// 		columnNumber,
// 	} = token) &&
// 	text &&
// 	(text = (intercepts[(intercept = `${goal} ${type} ${text}`)] ||
// 		intercepts[(intercept = `${goal} ${type}`)] ||
// 		intercepts[(intercept = `${goal} ${UNDEFINED}`)] ||
// 		intercepts[(intercept = `${type}`)] ||
// 		intercepts[(intercept = UNDEFINED)])(token)) &&
// 	(tokens.push({contextId, type, text, lineNumber, columnNumber, goal, group}), fragments.push(text));
