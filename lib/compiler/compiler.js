//@ts-check
/// <reference path="./types.d.ts" />

// import {tokenizer} from '../../../markup/dist/tokenizer.es.js';
import {Collator} from './collator.js';
import {ModuleSource, ModuleBinding} from './records.js';
import {Node} from './constructs.js';
import {tokenizeSourceText} from './tokenizer.js';
import {esx} from './rewriters.js';

export const {parseModuleText, parseDynamicModuleEvaluator} = (() => {
	const {DEBUG_COMPILER, DEBUG_CONSTRUCTS, DEBUG_NODES, INTERNAL_CONSOLE} = getFlags();

	/** @type {Console} */
	const console =
		(globalThis.console && (INTERNAL_CONSOLE !== false && globalThis.console['internal'])) || globalThis.console;

	const {log, warn, group, groupCollapsed, groupEnd, table} = console;

	/** @param {string} sourceText @param {ModuleSource} [sourceRecord] */
	const compileModule = (sourceText, sourceRecord) => {
		sourceRecord || (sourceRecord = new ModuleSource({sourceText: sourceText}));

		/** @type {ModuleSource['fragments']} */
		const fragments = (sourceRecord.fragments = []);
		/** @type {ModuleSource['bindings']} */
		const bindings = (sourceRecord.bindings = []);

		const tokens = tokenizeSourceText(sourceText);
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
		// sourceRecord.compiledText = sourceRecord.fragments.join('');
		sourceRecord.compiledText = rootNode.text;

		if (constructs.length) {
			/** @type {Node} */
			//@ts-ignore
			const Void = {};
			const constructData = {};

			for (const construct of constructs) {
				// @ts-ignore
				const {nodeType: constructType, text: constructText, lastToken} = construct;
				const trailer = construct[Node.nextTokenNode];
				const {nodeType: trailerType, text: trailerText} = trailer || Void;

				// const [, bindingIntent, declarationText] = /^(?=(import|export) |)(?:\1 )?(export default|.*) ?$/.exec(
				// 	constructType,
				// );

				const bindingIntent = constructType.startsWith('import')
					? 'import'
					: constructType.startsWith('export')
					? 'export'
					: undefined;

				const declarationText =
					bindingIntent === constructType || bindingIntent === undefined || constructType === 'export default'
						? constructType
						: constructType.slice(bindingIntent.length + 1);

				const bindingDeclaration = ModuleBinding.DeclarationType[declarationText];

				let internalType, externalType, internalIdentifier, externalIdentifier, externalModuleSpecifier, bindingRecord;

				switch (bindingDeclaration) {
					case 'FunctionDeclaration':
					case 'AsyncFunctionDeclaration':
					case 'GeneratorFunctionDeclaration':
					case 'AsyncGeneratorFunctionDeclaration':
						internalType = 'function';
					case 'ClassDeclaration':
						if (trailerType !== 'identifier')
							sourceRecord.error(`ConstructError: ${bindingDeclaration} must have a valid identifier`, {
								lineNumber: lastToken.lineNumber,
								columnNumber: lastToken.columnNumber,
							});
						internalIdentifier = trailerText;
						internalType === undefined && (internalType = 'class');
						bindingIntent === 'export' && ((externalIdentifier = internalIdentifier), (externalType = 'readonly'));
						break;
					case 'VariableDeclaration':
						internalType = declarationText;
						// TODO: Iterate until end of statement
						if (trailerType === '{…}') {
							// TODO: Destructure bindings
						} else if (trailerType === 'identifier') {
							internalIdentifier = trailerText;
							bindingIntent === 'export' &&
								((externalIdentifier = internalIdentifier),
								(externalType = internalType === 'const' ? 'constant' : 'readonly'));
						}
						break;
					case 'ExportDefaultAssignmentExpression':
						externalIdentifier = 'default';
						externalType = 'constant';
						break;
					case 'ImportDeclaration':
						if (trailerText === '*') {
							// TODO: import * as from
							break;
						} else if (trailerType === 'string') {
							externalModuleSpecifier = trailerText.slice(1, -1);
						} else if (trailerType === 'identifier') {
							// TODO: import default
							// if (trailer.nextToken.text !== ',')
							break;
							// TODO: import default, {}
						}
					case 'ExportDeclaration':
						if (trailerText === '*') {
							// TODO: export * as from
							break;
						}
					// TODO: Iterate until end of statement;
				}

				bindings.push(
					(bindingRecord = new ModuleBinding({
						bindingDeclaration,
						bindingIntent,
						internalType,
						externalType,
						internalIdentifier,
						externalIdentifier,
						externalModuleSpecifier,
					})),
				);

				constructData[`‹${constructType}›~‹${trailerType}›`] = {
					construct,
					constructType,
					constructText,
					bindingIntent,
					bindingDeclaration,
					declarationText,
					trailer,
					trailerText,
					trailerType,
					internalType,
					externalType,
					internalIdentifier,
					externalIdentifier,
					externalModuleSpecifier,
					bindingRecord,
				};
			}

			DEBUG_CONSTRUCTS &&
				table(constructData, [
					// 'constructText',
					'bindingIntent',
					'bindingDeclaration',
					// 'declarationText',
					'trailerText',
					'internalType',
					'internalIdentifier',
					'externalType',
					'externalIdentifier',
					'externalModuleSpecifier',
				]);
		}

		return sourceRecord;
	};

	/** @param {string} sourceText @param {ModuleSource} [sourceRecord] */
	const parseModuleText = (sourceText, sourceRecord) => {
		sourceRecord
			? (sourceRecord.sourceText = sourceText)
			: (sourceRecord = new ModuleSource({sourceText: sourceText, sourceType: 'module-text'}));
		return compileModule(sourceText, sourceRecord);
	};

	const SourceEvaluatorText = /^[\s\n]*module[\s\n]*=>[\s\n]*void[\s\n]*\([\s\n]*\([\s\n]*\)[\s\n]*=>[\s\n]*\{[ \t]*?\n?([^]*[\s\n]*?)\s*\}[\s\n]*\)[\s\n]*;?[\s\n]*$/;

	/** @param {Function|string} sourceEvaluator @param {ModuleSource} [sourceRecord] */
	const parseDynamicModuleEvaluator = (sourceEvaluator, sourceRecord) => {
		const sourceType = 'evaluator';

		//@ts-ignore
		const [, sourceEvaluatorText] = SourceEvaluatorText.exec(sourceEvaluator);

		const sourceText = esx.rewriteEvaluatorInput(sourceEvaluatorText);

		sourceRecord
			? (sourceRecord.sourceType = sourceType)
			: (sourceRecord = new ModuleSource({sourceEvaluatorText, sourceText, sourceType}));
		parseModuleText(sourceText, sourceRecord);

		sourceRecord.compiledEvaluatorText = esx.rewriteEvaluatorOutput(sourceRecord.compiledText); // debugger;

		DEBUG_COMPILER
			? typeof process === 'object'
				? log('%o\n\n%o', sourceRecord, sourceText)
				: log(
						'%O\n%c%ssourceEvaluatorText: %s\nsourceText: %s\ncompiledText: %s\ncompiledEvaluatorText: %s',
						sourceRecord,
						sourceEvaluatorText,
						sourceText,
						sourceRecord.compiledText,
						sourceRecord.compiledEvaluatorText,
				  )
			: DEBUG_CONSTRUCTS && log('%O\n%c%s', sourceRecord, 'whitespace: pre; font:monospace;', sourceText);
		return sourceRecord;
	};

	return {parseModuleText, parseDynamicModuleEvaluator};

	/** @param {{[name: string]: boolean}} param0 */
	function getFlags({DEBUG_COMPILER, DEBUG_CONSTRUCTS, DEBUG_NODES} = {}) {
		if (typeof location === 'object' && 'search' in location) {
			DEBUG_COMPILER = /\bcompiler\b/.test(location.search);
			DEBUG_NODES = /\bnodes\b/.test(location.search);
			DEBUG_CONSTRUCTS = /\bconstructs\b/.test(location.search);
		} else if (typeof process === 'object' && process.argv) {
			DEBUG_COMPILER = process.argv.includes('--compiler');
			DEBUG_NODES = process.argv.includes('--nodes');
			DEBUG_CONSTRUCTS = process.argv.includes('--constructs');
		}
		return {DEBUG_COMPILER, DEBUG_CONSTRUCTS, DEBUG_NODES};
	}
})();
