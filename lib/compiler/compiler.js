//@ts-check
/// <reference path="./types.js"

import {tokenizer} from '../../../markup/dist/tokenizer.es.js';
// import {tokenizer} from '../../../markup/experimental/es/standalone.js';
import {Collator} from './collator.js';
import {Source} from './constructs.js';

export const {parseModuleSourceText, parseDynamicModuleEvaluator} = (() => {
	const {DEBUG_COMPILER, DEBUG_CONSTRUCTS, INTERNAL_CONSOLE} = getFlags();

	/** @type {Console} */
	const console =
		(globalThis.console && (INTERNAL_CONSOLE !== false && globalThis.console['internal'])) || globalThis.console;
	const {log, warn, group, groupCollapsed, groupEnd, table} = console;

	/** @param {string} text @returns {TokenizerTokens} */
	const tokenize = text => tokenizer.tokenize(text, {console});

	/** @param {string} bodyText @param {Source} moduleSourceText */
	const compileBody = (bodyText, moduleSourceText) => {
		const {fragments = (moduleSourceText.fragments = [])} = moduleSourceText;

		const tokens = tokenize(bodyText);
		const collator = new Collator('ECMAScript');

		collator.log = log;

		for (const token of tokens) {
			if (!token || !token.text) continue;

			const node = collator.collate(token, tokens) || undefined;
			typeof node.text === 'string' && fragments.push(node.text);

			if (collator.queuedToken !== undefined) {
				const node = collator.collate(collator.queuedToken, tokens) || undefined;
				typeof node.text === 'string' && fragments.push(node.text);
			}
		}

		moduleSourceText.rootNode = collator.rootNode;
		moduleSourceText.constructs = (moduleSourceText.rootNode = collator.rootNode).constructs;

		return moduleSourceText;
	};

	const parseModuleSourceText = (bodyText, moduleSourceText) => {
		compileBody(bodyText, moduleSourceText);
		moduleSourceText.compiledText = moduleSourceText.fragments.join('');

		return moduleSourceText;
	};

	const parseDynamicModuleEvaluator = sourceText => {
		let bodyText;

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

		const moduleSourceText = parseModuleSourceText(bodyText, new Source());

		moduleSourceText.compiledText = moduleSourceText.compiledText
			.replace(/ \/\*‹\*\/ export default \/\*›\*\/ /g, 'exports.default =')
			.replace(/ \/\*‹\*\/(.*?)\/\*›\*\/ /g, '/*/$1/*/');

		DEBUG_COMPILER &&
			((DEBUG_CONSTRUCTS ? group : groupCollapsed)(bodyText),
			log(moduleSourceText),
			// moduleSourceText.rootNode.constructs.map(c => log(c, c.nextTokenNode)),
			groupEnd());

		return moduleSourceText;
	};

	return {parseModuleSourceText, parseDynamicModuleEvaluator};

	/** @param {{[name: string]: boolean}} param0 */
	function getFlags({DEBUG_COMPILER, DEBUG_CONSTRUCTS} = {}) {
		if (typeof location === 'object' && 'search' in location) {
			DEBUG_COMPILER = /\bcompiler\b|\bnodes\b/.test(location.search);
			DEBUG_CONSTRUCTS = /\bnodes\b/.test(location.search);
		} else if (typeof process === 'object' && process.argv) {
			DEBUG_COMPILER = process.argv.includes('--compiler') || process.argv.includes('--nodes');
			DEBUG_CONSTRUCTS = process.argv.includes('--nodes');
		}
		return {DEBUG_COMPILER, DEBUG_CONSTRUCTS};
	}

	function debugToken(token) {
		let node, text, type;
		DEBUG_CONSTRUCTS
			? (({node, text, type, ...token} = token),
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
			  ))
			: log(token);
	}
})();
