//@ts-check

// import {tokenizer} from '../../../markup/dist/tokenizer.es.js';
import {tokenizer} from '../../../markup/experimental/es/standalone.js';
import {Node, Root, Closure, Atom} from './types.js';

export const {compileModuleSourceText, compileFunction} = (() => {
	const {DEBUG_COMPILER, DEBUG_CONSTRUCTS, INTERNAL_CONSOLE} = Flags();

	/** @type {Console} */
	const console =
		(globalThis.console && (INTERNAL_CONSOLE !== false && globalThis.console['internal'])) || globalThis.console;
	const {log, warn, group, groupCollapsed, groupEnd, table} = console;

	const Collator = class Collator {
		/** @param {string} goal */
		constructor(goal) {
			this.goal = goal;
			this.declarations = [];
			this.faults = [];
			this.map = new WeakMap();
			this.nodeCount = 0;
			this.tokenCount = 0;
			/** @type {Node} */
			this.firstNode = this.lastNode = undefined;
			/** @type {tokenizer.Token} */
			this.firstToken = this.lastToken = this.nextToken = undefined;
			/** @type {tokenizer.Context} */
			this.firstContext = this.lastContext = undefined;
		}

		/**
		 * @param {tokenizer.Token} token
		 * @param {tokenizer.Context} tokenContext
		 */
		next(token, tokenContext) {
			let node, firstToken, lastToken, tokens;
			const {
				text,
				type,
				goal: {name},
				group,
				isWhitespace,
				isDelimiter,
				isComment,
				contextDepth,
				contextNumber,
				lineNumber,
				columnNumber,
				state: {nextToken},
			} = token;

			this.firstNode === undefined
				? ((this.firstToken = token),
				  this.map.set(
						(this.firstContext = tokenContext),
						(node = this.firstNode = new Root(tokenContext, undefined, this.nodeCount++)),
				  ))
				: (tokenContext === this.lastContext && (node = this.lastNode)) ||
				  ((node = this.map.get(tokenContext)) ||
						this.map.set(
							tokenContext,
							(node = new Closure(tokenContext, this.lastContext && this.map.get(this.lastContext), this.nodeCount++)),
						));

			this.lastContext = tokenContext;
			this.lastNode = node;
			this.nextToken = nextToken;
			this.lastToken = token;
			// ({firstToken, lastToken, tokens} = node);

			switch (type) {
				case 'comment':
				case 'inset':
				case 'whitespace':
					return node.appendText(text, type);
				case 'pattern':
				case 'quote':
				case 'number':
				case 'identifier':
				case 'operator':
				case 'keyword':
				case 'break':
				case 'opener':
				case 'closer':
					switch (text) {
						case '*':
						case '.':
						case ',':
						case ';':
						case '\n':
						case '=':
						case 'async':
						case 'import':
						case 'export':
						case 'const':
						case 'var':
						case 'let':
						case 'function':
						case 'class':
					}
					return node.appendToken(token, Atom);
				default:
					return node.appendToken(token);
			}
		}
	};

	/** @param {string} text @returns {tokenizer.Tokens} */
	const tokenize = text => tokenizer.tokenize(text, {console});

	const compileBody = (bodyText, moduleSourceText) => {
		const {
			fragments = (moduleSourceText.fragments = []),
			tokens = (moduleSourceText.tokens = []),
			bindings = (moduleSourceText.bindings = []),
		} = moduleSourceText;

		const collator = new Collator('ECMAScript');

		for (const token of tokenize(bodyText)) {
			if (!token || !token.text) continue;
			let indent;
			const {
				text,
				type,
				goal: {name: goal},
				group,
				state: {
					lastTokenContext: tokenContext,
					lastTokenContext: {id: contextId},
				},
				lineNumber,
				columnNumber,
			} = token;

			// const node = (goal === collator.goal && collator.next(token, tokenContext)) || undefined;
			const node = collator.next(token, tokenContext) || undefined;

			type === 'whitespace' || tokens.push({node, contextId, type, text, lineNumber, columnNumber, goal, group});
			fragments.push(type !== 'inset' ? text : indent ? text.replace(indent, '  ') : ((indent = text), '  '));
		}

		moduleSourceText.rootNode = collator.firstNode;

		return moduleSourceText;
	};

	const compileModuleSourceText = (bodyText, moduleSourceText) => {
		compileBody(bodyText, moduleSourceText);
		moduleSourceText.compiledText = moduleSourceText.fragments.join('');

		return moduleSourceText;
	};

	const compileFunction = sourceText => {
		let bodyText;

		const debugToken = DEBUG_CONSTRUCTS
			? ({node, text, type, ...token}) =>
					log(
						'%s  %s  %o',
						type
							.toUpperCase()
							.replace(/^([^]{10})[^]+$/, '$1…')
							.padEnd(12),
						text
							.trim()
							.replace(/^([^]{10})[^]+$/, '$1…')
							.padEnd(12),
						node,
					)
			: log;

		[
			,
			bodyText = '',
		] = /^[\s\n]*module[\s\n]*=>[\s\n]*void[\s\n]*\([\s\n]*\([\s\n]*\)[\s\n]*=>[\s\n]*\{[ \t]*?\n?([^]*)[\s\n]*\}[\s\n]*\)[\s\n]*;?[\s\n]*$/.exec(
			sourceText,
		);

		bodyText &&
			(bodyText = bodyText
				.replace(/\bmodule\.import`([^`]*)`/g, ' /*‹*/ import $1 /*›*/ ')
				.replace(/\bmodule\.export`([^`]*)`/g, ' /*‹*/ export $1 /*›*/ ')
				.replace(/\bmodule\.await[\s\n]*\(/g, 'module.await = (')
				.replace(/\bmodule\.export\.default[\s\n]*=/g, ' /*‹*/ export default /*›*/ '));

		const moduleSourceText = compileModuleSourceText(bodyText, new ModuleSourceText());

		moduleSourceText.compiledText = moduleSourceText.compiledText
			.replace(/ \/\*‹\*\/ export default \/\*›\*\/ /g, 'exports.default =')
			.replace(/ \/\*‹\*\/(.*?)\/\*›\*\/ /g, '/*/$1/*/');

		DEBUG_COMPILER &&
			((DEBUG_CONSTRUCTS ? group : groupCollapsed)(bodyText),
			// moduleSourceText.moduleSourceText.tokens.map(debugToken),
			// log(moduleSourceText.compiledText),
			log(moduleSourceText),
			// table(moduleSourceText.rootNode, [
			// 	'tokenNumber',
			// 	'contextNumber',
			// 	'contextDepth',
			// 	Symbol.toStringTag,
			// 	'text',
			// 	'lineNumber',
			// 	'columnNumber',
			// 	'punctuator',
			// ]),
			groupEnd());

		//  : table(moduleSourceText.tokens)

		return moduleSourceText;
	};

	class ModuleSourceText {
		constructor() {
			/** @type {string} */
			this.compiledText = undefined;
			/** @type {Node} */
			this.rootNode = undefined;
		}
		toString() {
			return this.compiledText;
		}
	}

	return {compileModuleSourceText, compileFunction};

	/** @param {{[name: string]: boolean}} param0 */
	function Flags({DEBUG_COMPILER, DEBUG_CONSTRUCTS} = {}) {
		if (typeof location === 'object' && 'search' in location) {
			DEBUG_COMPILER = /\bcompiler\b|\bnodes\b/.test(location.search);
			DEBUG_CONSTRUCTS = /\bnodes\b/.test(location.search);
		} else if (typeof process === 'object' && process.argv) {
			DEBUG_COMPILER = process.argv.includes('--compiler') || process.argv.includes('--nodes');
			DEBUG_CONSTRUCTS = process.argv.includes('--nodes');
		}
		return {DEBUG_COMPILER, DEBUG_CONSTRUCTS};
	}
})();

/** @typedef {import('/markup/experimental/es/types').Token} tokenizer.Token */
/** @typedef {Iterable<tokenizer.Token>} tokenizer.Tokens */
/** @typedef {import('/markup/experimental/es/types').Match} tokenizer.Match */
/** @typedef {import('/markup/experimental/es/types').Capture} tokenizer.Capture */
/** @typedef {import('/markup/experimental/es/types').Group} tokenizer.Group */
/** @typedef {import('/markup/experimental/es/types').Groups} tokenizer.Groups */
/** @typedef {import('/markup/experimental/es/types').Goal} tokenizer.Goal */
/** @typedef {import('/markup/experimental/es/types').Context} tokenizer.Context */
/** @typedef {import('/markup/experimental/es/types').Contexts} tokenizer.Contexts */
/** @typedef {import('/markup/experimental/es/types').State} tokenizer.State */
