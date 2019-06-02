//@ts-check
/// <reference path="./types.d.ts" />

// import {tokenizer} from '../../../markup/dist/tokenizer.es.js';
import {Collator} from './collator.js';
import {ModuleSource, ModuleBinding} from './records.js';
import {Node} from './tree.js';
import {tokenizeSourceText} from './tokenizer.js';
import {esx} from './rewriters.js';
import * as symbols from './symbols.js';

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

		const nonBindings = [];

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
			const Void = Object();
			const constructData = {};

			let bindingRecord;
			let count = 0;

			const constructList = [];

			for (const construct of constructs) {
				constructList.push(construct.type);
				count++;
				bindingRecord = createBindingRecordFromConstruct(construct, sourceRecord);
				if (bindingRecord === undefined) {
					nonBindings.push(construct);
					// constructData[`${count}: ! ${construct.type}`] = construct;
					continue;
				}
				bindings.push(bindingRecord);
				// constructData[`${count}: √ ${bindingRecord[Symbol.toStringTag]}`] = bindingRecord;
			}

			if (DEBUG_CONSTRUCTS) {
				bindings.length && table(bindings);
				nonBindings.length && table(nonBindings);
				// Object.keys(constructData).length > 0 &&
				// table(
				// 	constructData,
				// 	// 'bindingDeclaration', 'bindingIntent', 'externalModuleSpecifier',
				// 	['internalType', 'externalType', 'internalIdentifier', 'externalIdentifier'],
				// );
			}

			console.log(constructList.map(v => `- \`${v}\``).join('\n'));
		}

		return sourceRecord;
	};

	/**
	 * @param {ConstructNode} construct
	 * @param {SourceRecord} sourceRecord
	 * @returns {BindingRecord}
	 */
	const createBindingRecordFromConstruct = (construct, sourceRecord) => {
		// let node = construct[symbols.NextTokenNode];

		// if (!node) return;

		const record = {};

		const bindingIntent = (record.bindingIntent = construct.type.startsWith('import')
			? 'import'
			: construct.type.startsWith('export')
			? 'export'
			: undefined);

		record.declarationText =
			bindingIntent === construct.type || bindingIntent === undefined || construct.type === 'export default'
				? construct.type
				: construct.type.slice(bindingIntent.length + 1);

		record.bindingDeclaration = ModuleBinding.DeclarationType[record.declarationText];

		if (record.bindingDeclaration !== undefined) {
			return createDeclarationRecord(construct, record, sourceRecord);
		}
	};

	// * @param {Node} node
	/**
	 * @param {ConstructNode} construct
	 * @param {*} record
	 * @param {SourceRecord} sourceRecord
	 * @returns {BindingRecord}
	 */
	const createDeclarationRecord = (construct, record, sourceRecord) => {
		/** @type {Node} */
		let node = construct[symbols.NextTokenNode];
		const bindingTarget =
			construct[symbols.BindingClause] != null
				? construct[symbols.BindingClause].text
				: node.type === 'identifier'
				? node.text
				: node.type === '{…}'
				? node.text
				: record.bindingIntent !== undefined && node.text === '*'
				? node[symbols.NextTokenNode][symbols.NextTokenNode].text
				: undefined;

		switch (record.bindingDeclaration) {
			case 'FunctionDeclaration':
			case 'AsyncFunctionDeclaration':
			case 'GeneratorFunctionDeclaration':
			case 'AsyncGeneratorFunctionDeclaration':
			case 'ClassDeclaration':
				if (node.type !== 'identifier')
					sourceRecord.error(`ConstructError: ${record.bindingDeclaration} must have a valid identifier`, {
						lineNumber: construct.lastToken.lineNumber,
						columnNumber: construct.lastToken.columnNumber,
					});
				record.internalIdentifier = bindingTarget;
				record.internalType = record.bindingDeclaration === 'ClassDeclaration' ? 'class' : 'function';
				record.bindingIntent === 'export' &&
					((record.exportedIdentifier = record.internalIdentifier), (record.exportedType = 'readonly'));
				break;
			case 'VariableDeclaration':
				//@ts-ignore
				record.internalType = record.declarationText;
				// TODO: Iterate until end of statement
				if (node.type === '{…}') {
					// TODO: Destructure bindings
					// break;
				} else if (node.type === 'identifier') {
					record.internalIdentifier = bindingTarget;
					if (record.bindingIntent === 'export') {
						record.exportedIdentifier = record.internalIdentifier;
						record.exportedType = record.internalType === 'const' ? 'constant' : 'readonly';
					}
					break;
				}
			case 'ExportDefaultAssignmentExpression':
				record.exportedType = 'constant';
				record.internalType = 'void';
				record.exportedIdentifier = 'default';
				break;
			case 'ImportDeclaration':
				// TODO:
				// TODO: import default, {} // if (trailer.nextToken.text !== ',')
				if (node.text === '*') {
					record.importedIdentifier = '*';
					record.internalIdentifier = bindingTarget;
					break;
				} else if (node.type === 'string') {
					record.externalModuleSpecifier = node.text.slice(1, -1);
					break;
				} else if (node.type === 'identifier') {
					record.importedIdentifier = 'default';
					record.internalIdentifier = bindingTarget;
					break;
				} else if (node.type === '{…}') {
					// break;
				}
			case 'ExportDeclaration':
				// TODO: export {…}
				if (node.text === '*') {
					record.exportedIdentifier = bindingTarget;
					break;
				} else if (node.type === '{…}') {
					// break;
				}
			default:
				console.log(record.bindingDeclaration, node);
			// if (!bindingDeclaration) debugger;
		}
		return createBindingRecord(record);
	};

	/** @param {BindingRecord} record */
	/** @returns {BindingRecord} */
	const createBindingRecord = record => new ModuleBinding(record);

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
