//@ts-check
/// <reference path="./types.d.ts" />

import {Matcher} from '../../../markup/packages/matcher/matcher.js';

export const {esx, Rewriter} = (Rewriter => {
	const {escape, sequence, join} = Matcher;
	const {freeze} = Object;
	const {raw} = String;

	/**
	 * @param {TemplateStringsArray} strings
	 * @param {... string} values
	 */
	const regexp = (strings, ...values) => RegExp(sequence(strings, ...values), 'g');

	const word = word => sequence/* regexp */ `\b${escape(word)}\b`;

	const MARK = '/*/';
	const MARKS = '/*@*/';
	const STARTS = '/*‹*/';
	const ENDS = '/*›*/';
	const LITERAL = '`([^`]*)`';

	const esx = {};

	esx.input = {
		MarkedExport: Rewriter(
			regexp/* regexp */ `${escape(MARK)}export${escape(MARK)}[\s\n]*(${'const let var async function class'
				.split(' ')
				.map(word)
				.join('|')})`,
			raw` ${MARKS}export $1`,
		),
		ModuleImport: Rewriter(regexp/* regexp */ `\bmodule\.import\b${LITERAL}`, raw` ${STARTS} import $1 ${ENDS} `),
		ModuleExport: Rewriter(regexp/* regexp */ `\bmodule\.export\b${LITERAL}`, raw` ${STARTS} export $1 ${ENDS} `),
		ModuleAwait: Rewriter(regexp/* regexp */ `\bmodule\.await\b[\s\n]*\(`, raw`module.await = (`),
		ModuleExportDefault: Rewriter(
			regexp/* regexp */ `\bmodule\.export\.default\b[\s\n]*=`,
			` ${STARTS} export default ${ENDS} `,
		),
	};
	(esx.output = {
		UnmarkedExport: Rewriter(regexp/* regexp */ ` ${escape(MARKS)}export `, raw`${MARK}export${MARK} `),
		WrappedExportDefault: Rewriter(
			regexp/* regexp */ ` ${escape(STARTS)} export default ${escape(ENDS)} `,
			raw`exports.default =`,
		),
		UntaggedExpression: Rewriter(regexp/* regexp */ ` ${escape(STARTS)}([^]*?)${escape(ENDS)} `, raw`${MARK}$1${MARK}`),
	}),
		(esx.rewriteEvaluatorInput = Rewriter.create(
			esx.input.MarkedExport,
			esx.input.ModuleImport,
			esx.input.ModuleExport,
			esx.input.ModuleAwait,
			esx.input.ModuleExportDefault,
		));
	esx.rewriteEvaluatorOutput = Rewriter.create(
		esx.output.UnmarkedExport,
		esx.output.WrappedExportDefault,
		esx.output.UntaggedExpression,
	);

	return {esx, Rewriter};
})(
	(() => {
		const {replace: ReplaceSymbol} = Symbol;
		const {freeze, defineProperties} = Object;

		/**
		 * @template {RegExp} T
		 * @template {string|((...args) => string)} U
		 * @template {PropertyDescriptorMap} V
		 * @param {T} expression
		 * @param {U} rewrite
		 * @param {V} [propertyDescriptors]
		 * @returns {T & {readonly rewrite: U} & DescribedType<V>}
		 */
		const Rewriter = (expression, rewrite, propertyDescriptors) =>
			defineProperties(expression, {
				...propertyDescriptors,
				...Rewriter.descriptors,
				rewrite: {value: rewrite, writable: false, enumerable: true},
			});

		Rewriter.reducer = (string, rewriter) => rewriter[ReplaceSymbol](string);

		/** @type {(... RegExp) => (source: string) => string} */
		Rewriter.create = (...rewriters) => string => rewriters.reduce(Rewriter.reducer, string);

		Rewriter.descriptors = Object.getOwnPropertyDescriptors(
			class Rewriter extends RegExp {
				[ReplaceSymbol](string, replacement) {
					//@ts-ignore
					return replacement == null && (({rewrite: replacement} = this), replacement) == null
						? string
						: super[ReplaceSymbol](string, replacement);
				}
			}.prototype,
		);

		return freeze(Rewriter);
	})(),
);
