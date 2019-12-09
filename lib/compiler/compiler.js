//@ts-check
/// <reference path="./types.d.ts" />

// import {tokenizer} from '../../../markup/dist/tokenizer.es.js';
import {Collator} from '../collator/collator.js';
import {ModuleSource, ModuleBinding} from './records.js';
import {tokenizeSourceText} from './tokenizer.js';
import {esx} from './rewriters.js';
// import * as symbols from './symbols.js';
import {environment} from '../environment.js';

export const {parseModuleText, parseDynamicModuleEvaluator} = (() => {
	const {DEBUG_COMPILER, DEBUG_CONSTRUCTS, INTERNAL_CONSOLE} = getFlags();

	/** @type {Console} */
	const console =
		(globalThis.console && (INTERNAL_CONSOLE !== false && globalThis.console['internal'])) || globalThis.console;

	const {log, warn, group, groupCollapsed, groupEnd, table} = console;

	/** @param {string} sourceText @param {ModuleSource} [sourceRecord] */
	const compileModule = (sourceText, sourceRecord) => {
		const {bindings = (sourceRecord.bindings = /** @type {ModuleSource['bindings']} */ ([]))} =
			sourceRecord || (sourceRecord = new ModuleSource({sourceText: sourceText}));
		const nonBindings = [];
		const {
			collator: {
				rootNode: {constructs},
			},
		} = Collator.collate({sourceRecord, tokens: tokenizeSourceText(sourceText), log});

		if (constructs.length) {
			let bindingRecords;
			// /** @type {constructs} */
			const constructList = [];

			for (const construct of constructs) {
				constructList.push(construct.type);
				bindingRecords = createBindingRecordsFromConstruct(construct, sourceRecord);
				if (bindingRecords === undefined || bindingRecords.length === 0) {
					nonBindings.push(construct);
					continue;
				}
				for (const bindingRecord of bindingRecords) {
					bindings.push(bindingRecord);
				}
			}

			if (DEBUG_CONSTRUCTS) {
				bindings.length && table(bindings);
				nonBindings.length && table(nonBindings);
				// console.log(constructList.map(v => `- \`${v}\``).join('\n'));
			}
		}

		return sourceRecord;
	};

	/**
	 * @param {ConstructNode} construct
	 * @param {SourceRecord} sourceRecord
	 * @returns {BindingRecord[]}
	 */
	const createBindingRecordsFromConstruct = (construct, sourceRecord) => {
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
			return initializeDeclarationRecord(construct, record, sourceRecord);
			// declarationRecord
			// return createDeclarationRecord(construct, record, sourceRecord);
		}
	};

	// * @param {Node} node
	/**
	 * @param {ConstructNode} construct
	 * @param {*} record
	 * @param {SourceRecord} sourceRecord
	 * @returns {BindingRecord[]}
	 */
	const initializeDeclarationRecord = (construct, record, sourceRecord) => {
		let error, declarations, nodes;
		if (!construct.initializeDeclarationRecord) return;
		({error, declarations, nodes} = construct.initializeDeclarationRecord(record));
		error && sourceRecord.error(`${error.type}: ${error.message}`, error);
		DEBUG_CONSTRUCTS && log(record.bindingDeclaration, {record, construct, declarations, nodes});
		const bindingRecords = [];
		for (const declaration of declarations) {
			bindingRecords.push(createBindingRecord({...declaration, ...record}));
		}
		return bindingRecords;
		// return
		// return createBindingRecord(record);
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
			? environment.process || console !== globalThis.console
				? log('%o\n\n%o', sourceRecord, sourceText)
				: log(
						'%O\n%c%ssourceEvaluatorText: %s\nsourceText: %s\ncompiledText: %s\ncompiledEvaluatorText: %s',
						sourceRecord,
						sourceEvaluatorText,
						sourceText,
						sourceRecord.compiledText,
						sourceRecord.compiledEvaluatorText,
				  )
			: DEBUG_CONSTRUCTS &&
			  (environment.process || console !== globalThis.console
					? log('%O\n%s', sourceRecord, sourceText)
					: log('%O\n%c%s', sourceRecord, 'whitespace: pre; font:monospace;', sourceText));
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

/** @typedef {import('../collator/nodes.js').Node} Node*/

// /**
//  * @param {ConstructNode} construct
//  * @param {*} record
//  * @param {SourceRecord} sourceRecord
//  * @returns {BindingRecord}
//  */
// const createDeclarationRecord = (construct, record, sourceRecord) => {
// 	const {NextTokenNode, BindingClause} = construct.symbols;
// 	/** @type {Node} */
// 	let node = construct[NextTokenNode];
// 	const bindingTarget = construct[BindingClause] != null ? construct[BindingClause].text : undefined;

// 	switch (record.bindingDeclaration) {
// 		case 'FunctionDeclaration':
// 		case 'AsyncFunctionDeclaration':
// 		case 'GeneratorFunctionDeclaration':
// 		case 'AsyncGeneratorFunctionDeclaration':
// 		case 'ClassDeclaration':
// 			if (node.type !== 'identifier') {
// 				sourceRecord.error(`ConstructError: ${record.bindingDeclaration} must have a valid identifier`, {
// 					lineNumber: construct.lastToken.lineNumber,
// 					columnNumber: construct.lastToken.columnNumber,
// 				});
// 				if (!FORCE_INCOMPLETE_CONSTRUCTS) break;
// 				else if (DEBUG_CONSTRUCTS) log(record.bindingDeclaration, construct, node);
// 			}
// 			record.internalIdentifier = bindingTarget;
// 			record.internalType = record.bindingDeclaration === 'ClassDeclaration' ? 'class' : 'function';
// 			if (record.bindingIntent === 'export') {
// 				record.exportedIdentifier = record.internalIdentifier;
// 				record.exportedType = 'readonly';
// 			}
// 			return createBindingRecord(record);
// 		case 'VariableDeclaration':
// 			record.internalType = record.declarationText;
// 			if (node.type === '{…}') {
// 				// TODO: Destructure bindings
// 				if (!FORCE_INCOMPLETE_CONSTRUCTS) break;
// 				else if (DEBUG_CONSTRUCTS) log(record.bindingDeclaration, construct, node);
// 			} else if (node.type === 'identifier') {
// 				record.internalIdentifier = bindingTarget;
// 				if (record.bindingIntent === 'export') {
// 					record.exportedIdentifier = record.internalIdentifier;
// 					record.exportedType = record.internalType === 'const' ? 'constant' : 'readonly';
// 				}
// 			}
// 			return createBindingRecord(record);
// 		case 'ExportDefaultAssignmentExpression':
// 			record.exportedType = 'constant';
// 			record.internalType = 'void';
// 			record.exportedIdentifier = 'default';
// 			return createBindingRecord(record);
// 		case 'ImportDeclaration':
// 			if (node.text === '*') {
// 				record.importedIdentifier = '*';
// 				record.internalIdentifier = bindingTarget;
// 			} else if (node.type === 'string') {
// 				record.externalModuleSpecifier = node.text.slice(1, -1);
// 			} else if (node.type === 'identifier') {
// 				record.importedIdentifier = 'default';
// 				record.internalIdentifier = bindingTarget;
// 				// TODO: import default, {} // if (trailer.nextToken.text !== ',')
// 			} else if (node.type === '{…}') {
// 				// TODO: import {…}
// 				if (!FORCE_INCOMPLETE_CONSTRUCTS) break;
// 				else if (DEBUG_CONSTRUCTS) log(record.bindingDeclaration, construct, node);
// 			}
// 			return createBindingRecord(record);
// 		case 'ExportDeclaration':
// 			if (node.text === '*') {
// 				record.exportedIdentifier = bindingTarget;
// 			} else if (node.type === '{…}') {
// 				// TODO: export {…}
// 				if (!FORCE_INCOMPLETE_CONSTRUCTS) break;
// 				else if (DEBUG_CONSTRUCTS) log(record.bindingDeclaration, construct, node);
// 			}
// 			return createBindingRecord(record);
// 	}
// 	log(record.bindingDeclaration, construct, node);
// };

// /** @param {string} sourceText @param {ModuleSource} [sourceRecord] */
// const compileModule = (sourceText, sourceRecord) => {
// 	const {bindings = (sourceRecord.bindings = /** @type {ModuleSource['bindings']} */ ([]))} =
// 		sourceRecord || (sourceRecord = new ModuleSource({sourceText: sourceText}));

// 	// /** @type {ModuleSource['fragments']} */
// 	// const fragments = (sourceRecord.fragments = []);
// 	// /** @type {ModuleSource['bindings']} */
// 	// const bindings = (sourceRecord.bindings = []);

// 	const nonBindings = [];
// 	// const tokens = tokenizeSourceText(sourceText);
// 	// const collator = new Collator('ECMAScript');

// 	// collator.log = log;

// 	// for (const token of tokens) {
// 	// 	if (!token || !token.text) continue;

// 	// 	const node = collator.collate(token, tokens) || undefined;
// 	// 	typeof node.text === 'string' && fragments.push(node.text);

// 	// 	if (collator.queuedToken !== undefined) {
// 	// 		const node = collator.collate(collator.queuedToken, tokens) || undefined;
// 	// 		typeof node.text === 'string' && fragments.push(node.text);
// 	// 	}
// 	// }

// 	// const tokens = tokenizeSourceText(sourceText);
// 	const {
// 		collator: {
// 			rootNode: {constructs},
// 		},
// 	} = Collator.collate({sourceRecord, tokens: tokenizeSourceText(sourceText), log});

// 	// const {
// 	// 	rootNode,
// 	// 	rootNode: {constructs},
// 	// } = collator;

// 	// sourceRecord.rootNode = rootNode;
// 	// sourceRecord.constructs = constructs;
// 	// sourceRecord.compiledText = rootNode.text;

// 	if (constructs.length) {
// 		let bindingRecord;
// 		// /** @type {constructs} */
// 		const constructList = [];

// 		for (const construct of constructs) {
// 			constructList.push(construct.type);
// 			bindingRecord = createBindingRecordFromConstruct(construct, sourceRecord);
// 			if (bindingRecord === undefined) {
// 				nonBindings.push(construct);
// 				continue;
// 			}
// 			bindings.push(bindingRecord);
// 		}

// 		if (DEBUG_CONSTRUCTS) {
// 			bindings.length && table(bindings);
// 			nonBindings.length && table(nonBindings);
// 			// console.log(constructList.map(v => `- \`${v}\``).join('\n'));
// 		}
// 	}

// 	return sourceRecord;
// };
