//@ts-check
/// <reference path="./types.d.ts"

import {tokenizer} from '../../../markup/dist/tokenizer.es.js';
// import {tokenizer} from '../../../markup/experimental/es/standalone.js';
import {Collator} from './collator.js';
import {ModuleSource} from './records.js';
import {Node} from './constructs.js';

export const {parseModuleText, parseDynamicModuleEvaluator} = (() => {
	const {DEBUG_COMPILER, DEBUG_CONSTRUCTS, INTERNAL_CONSOLE} = getFlags();

	/** @type {Console} */
	const console =
		(globalThis.console && (INTERNAL_CONSOLE !== false && globalThis.console['internal'])) || globalThis.console;

	const {log, warn, group, groupCollapsed, groupEnd, table} = console;

	/** @param {string} text @returns {TokenizerTokens} */
	const tokenize = text => tokenizer.tokenize(text, {console});

	/** @param {string} sourceText @param {ModuleSource} [sourceRecord] */
	const compileModule = (sourceText, sourceRecord) => {
		sourceRecord || (sourceRecord = new ModuleSource({sourceText}));

		/** @type {ModuleSource['fragments']} */
		const fragments = (sourceRecord.fragments = []);
		/** @type {ModuleSource['bindings']} */
		const bindings = (sourceRecord.bindings = []);

		const tokens = tokenize(sourceText);
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

		const {
			rootNode,
			rootNode: {constructs},
		} = collator;

		sourceRecord.rootNode = rootNode;
		sourceRecord.constructs = constructs;
		sourceRecord.compiledText = sourceRecord.fragments.join('');

		if (constructs.length) {
			/** @type {Node} */
			//@ts-ignore
			const Void = {};
			const constructData = {};

			for (const construct of constructs) {
				// @ts-ignore
				const {nodeType: constructType, text: constructText} = construct;
				const trailer = construct[Node.nextTokenNode];
				const {nodeType: trailerType, text: trailerText} = trailer || Void;

				constructData[`‹${constructType}›~‹${trailerType}›`] = {
					constructType,
					trailerType,
					constructText,
					trailerText,
					construct,
					trailer,
				};
				// log('‹%s›~‹%s›\n%o', constructText, followingText, {
				// 	constructType,
				// 	constructText,
				// 	followingType,
				// 	followingText,
				// 	construct,
				// 	next,
				// });
			}

			console.table(constructData, ['constructText', 'trailerText']);
		}

		return sourceRecord;
	};

	/** @param {string} sourceText @param {ModuleSource} [sourceRecord] */
	const parseModuleText = (sourceText, sourceRecord) => {
		sourceRecord
			? (sourceRecord.sourceText = sourceText)
			: (sourceRecord = new ModuleSource({sourceText, sourceType: 'module-text'}));
		return compileModule(sourceText, sourceRecord);
	};

	/** @param {Function|string} source @param {ModuleSource} [sourceRecord] */
	const parseDynamicModuleEvaluator = (source, sourceRecord) => {
		let sourceText;

		[
			,
			sourceText = '',
		] = /^[\s\n]*module[\s\n]*=>[\s\n]*void[\s\n]*\([\s\n]*\([\s\n]*\)[\s\n]*=>[\s\n]*\{[ \t]*?\n?([^]*)[\s\n]*\}[\s\n]*\)[\s\n]*;?[\s\n]*$/.exec(
			String(source),
		);

		sourceText &&
			(sourceText = sourceText
				.replace(/\bmodule\.import`([^`]*)`/g, ' /*‹*/ import $1 /*›*/ ')
				.replace(/\bmodule\.export`([^`]*)`/g, ' /*‹*/ export $1 /*›*/ ')
				.replace(/\bmodule\.await[\s\n]*\(/g, 'module.await = (')
				.replace(/\bmodule\.export\.default[\s\n]*=/g, ' /*‹*/ export default /*›*/ '));

		sourceRecord
			? (sourceRecord.sourceType = 'dynamic-module-evaluator')
			: (sourceRecord = new ModuleSource({sourceText, sourceType: 'dynamic-module-evaluator'}));
		parseModuleText(sourceText, sourceRecord);

		sourceRecord.compiledText = sourceRecord.compiledText
			.replace(/ \/\*‹\*\/ export default \/\*›\*\/ /g, 'exports.default =')
			.replace(/ \/\*‹\*\/([^]*?)\/\*›\*\/ /g, '/*/$1/*/');

		DEBUG_COMPILER &&
			(typeof process === 'object'
				? log('%s\n%o', sourceText, sourceRecord)
				: log('%c%s%c\n%o', 'whitespace: pre; font:monospace;', sourceText, '', sourceRecord));
		return sourceRecord;
	};

	return {parseModuleText, parseDynamicModuleEvaluator};

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
})();
