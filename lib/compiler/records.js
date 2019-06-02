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
			if (record) {
				({
					bindingIntent: this.bindingIntent,
					bindingDeclaration: this.bindingDeclaration,
					internalType: this.internalType,
					exportedType: this.exportedType,
					internalIdentifier: this.internalIdentifier,
					exportedIdentifier: this.exportedIdentifier,
					importedIdentifier: this.importedIdentifier,
					externalModuleSpecifier: this.externalModuleSpecifier,
				} = record);

				// Object.defineProperty(this, 'bindingDescription', {value: record.bindingDescription, enumerable: false});
			} else {
				/** @type {'import'|'export'|undefined} */
				this.bindingIntent = undefined;
				/** @type {DeclarationType|undefined} */
				this.bindingDeclaration = undefined;
				/** @type {'const'|'let'|'var'|'function'|'class'|'binding'|'void'|undefined} */
				this.internalType = undefined;
				/** @type {'constant'|'readonly'|'symbolic'|undefined} */
				this.exportedType = undefined;
				/** @type {string|undefined} */
				this.internalIdentifier = this.exportedIdentifier = this.importedIdentifier = undefined;
				/** @type {string|undefined} */
				this.externalModuleSpecifier = undefined;
			}
		}
	}

	ModuleBinding.DeclarationType = DeclarationType;

	class ModuleSource {
		/** @param {Partial<ModuleSource>} [record] */
		constructor(record) {
			if (record) {
				({
					compiledText: this.compiledText,
					compiledEvaluatorText: this.compiledEvaluatorText,
					sourceText: this.sourceText,
					sourceEvaluatorText: this.sourceEvaluatorText,
					sourceType: this.sourceType,
					rootNode: this.rootNode,
					fragments: this.fragments,
					bindings: this.bindings,
					constructs: this.constructs,
					errors: this.errors,
				} = record);
			} else {
				/** @type {string} */
				this.compiledText = undefined;
				/** @type {string} */
				this.compiledEvaluatorText = undefined;
				/** @type {string} */
				this.sourceText = undefined;
				/** @type {string} */
				this.sourceEvaluatorText = undefined;
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
			}
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
