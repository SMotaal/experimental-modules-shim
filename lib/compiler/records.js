//@ts-check
/// <reference path="./types.d.ts"

import * as symbols from './symbols.js';

export const {ModuleSource, ModuleBinding} = (() => {
	/** @param {Partial<ModuleBinding>} [record] */
	class ModuleBinding {
		constructor(record) {
			/** @type {'import'|'export'|'local'} */
			this.bindingIntent = undefined;

			/** @type {'const'|'let'|'var'|'function'|'class'|'imported'} */
			this.intrinsicType = undefined;

			/** @type {'exported'|'symbolic'} */
			this.extrinsicType = undefined;

			/** @type {string} */
			this.internalIdentifier = this.externalIdentifier = undefined;

			record &&
				({
					bindingIntent: this.bindingIntent,
					intrinsicType: this.intrinsicType,
					extrinsicType: this.extrinsicType,
					intrinsicIdentifier: this.internalIdentifier,
					extrinsicIdentifier: this.externalIdentifier,
				} = record);
		}
	}

	class ModuleSource {
		/** @param {Partial<ModuleSource>} [record] */
		constructor(record) {
			/** @type {string} */
			this.compiledText = undefined;

			/** @type {string} */
			this.sourceText = undefined;

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

			record &&
				({
					compiledText: this.compiledText,
					sourceText: this.sourceText,
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
	}

	return {ModuleSource, ModuleBinding};
})();

/** @typedef {ModuleSource} SourceRecord */
/** @typedef {ModuleBinding} BindingRecord */
