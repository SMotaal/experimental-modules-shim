import * as symbols from './symbols.js';

export const constructors = {};

/** @typedef {} Construction */

{
	const {defineProperties} = Object;

	const Constructor = (reducer =>
		/**
		 * @template {symbol} P
		 * @template {symbol[]} Q
		 * @param {P} symbol
		 * @param {Q} symbols
		 * @returns {{<T extends ConstructNode>(node: T): T, symbol: P, symbols: Q}}
		 */
		(symbol, ...symbols) =>
			defineProperties(
				node => {
					if (node[symbol] !== undefined) debugger;
					return (node[symbol] = symbols.reduce(reducer, node));
				},
				{name: {value: symbol['description']}, symbol: {value: symbol}, symbols: {value: symbols}},
			))((construction, symbol) => (symbol in construction || (construction[symbol] = null), construction));

	constructors.function = Constructor(
		symbols.FunctionConstruct,
		symbols.FunctionBody,
		symbols.FunctionArguments,
		symbols.BindingClause,
		symbols.ArgumentConstruct,
		symbols.BlockConstruct,
	);
	constructors.class = Constructor(
		symbols.ClassConstruct,
		symbols.ClassBody,
		symbols.BindingClause,
		symbols.BlockConstruct,
	);

	constructors.const = constructors.var = constructors.let = Constructor(
		symbols.VariableConstruct,
		symbols.BindingClause,
		symbols.BindingConstruct,
		symbols.BlockConstruct,
	);
	constructors.import = Constructor(
		symbols.ImportConstruct,
		symbols.FromClause,
		symbols.BindingClause,
		symbols.BindingConstruct,
		symbols.BlockConstruct,
	);
	constructors.export = Constructor(
		symbols.ExportConstruct,
		symbols.FromClause,
		symbols.BindingClause,
		symbols.BindingConstruct,
		symbols.BlockConstruct,
	);
}
