//@ts-check
/// <reference path="./types.d.ts" />

import * as symbols from './symbols.js';

export const {ModuleSource, ModuleBinding, DeclarationType} = (() => {
	const DeclarationType = {
		['function']: 'FunctionDeclaration',
		['async function']: 'AsyncFunctionDeclaration',
		['function*']: 'GeneratorFunctionDeclaration',
		['async function*']: 'AsyncGeneratorFunctionDeclaration',
		['class']: 'ClassDeclaration',
		['const']: 'VariableDeclaration',
		['let']: 'VariableDeclaration',
		['var']: 'VariableDeclaration',
		['import']: 'ImportDeclaration',
		['export']: 'ExportDeclaration',
		['export default']: 'ExportDefaultAssignmentExpression',
	};

	/** @param {Partial<ModuleBinding>} [record] */
	class ModuleBinding {
		constructor(record) {
			/** @type {'import'|'export'|undefined} */
			this.bindingIntent = undefined;

			/** @type {DeclarationType|undefined} */
			this.bindingDeclaration = undefined;

			/** @type {'const'|'let'|'var'|'function'|'class'|'binding'|undefined} */
			this.internalType = undefined;

			/** @type {'constant'|'readonly'|'symbolic'|undefined} */
			this.externalType = undefined;

			/** @type {string|undefined} */
			this.internalIdentifier = this.externalIdentifier = undefined;

			/** @type {string|undefined} */
			this.externalModuleSpecifier = undefined;

			record &&
				({
					bindingIntent: this.bindingIntent,
					bindingDeclaration: this.bindingDeclaration,
					internalType: this.internalType,
					externalType: this.externalType,
					internalIdentifier: this.internalIdentifier,
					externalIdentifier: this.externalIdentifier,
					externalModuleSpecifier: this.externalModuleSpecifier,
				} = record);
		}
	}

	ModuleBinding.DeclarationType = DeclarationType;

	class ModuleSource {
		/** @param {Partial<ModuleSource>} [record] */
		constructor(record) {
			/** @type {string} */
			this.compiledText = undefined;

			/** @type {string} */
			this.sourceText = undefined;

			/** @type {string} */
			this.sourceEvaluatorText = undefined;

			/** @type {string} */
			this.compiledEvaluatorText = undefined;

			/** @type {string} */
			this.sourceType = undefined;

			/** @type {RootNode} */
			this.rootNode = undefined;

			/** @type {string[]} */
			this.fragments = undefined;

			/** @type {BindingRecord[]} */
			this.bindings = undefined;

			/** @type {ConstructNode[]} */
			this.constructs = undefined;

			/** @type {Error[]} */
			this.errors = undefined;

			record &&
				({
					sourceText: this.sourceText,
					sourceEvaluatorText: this.sourceEvaluatorText,
					compiledText: this.compiledText,
					compiledEvaluatorText: this.compiledEvaluatorText,
					sourceType: this.sourceType,
					rootNode: this.rootNode,
					fragments: this.fragments,
					bindings: this.bindings,
					constructs: this.constructs,
				} = record);
		}

		toString() {
			return this.compiledText;
		}

		/** @param {string} message @param {{lineNumber: number, columnNumber: number}} properties */
		error(message, properties, ErrorClass = Error) {
			const error = Object.assign(new ErrorClass(message), properties);
			this.errors === undefined ? (this.errors = [error]) : this.errors.push(error);
		}
	}

	return {ModuleSource, ModuleBinding, DeclarationType};
})();

/** @typedef {ModuleSource} SourceRecord */
/** @typedef {ModuleBinding} BindingRecord */
/** @typedef {keyof (typeof DeclarationType)} DeclarationType */
