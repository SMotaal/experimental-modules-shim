//@ts-check

/// Compiler Types
type SourceRecord = import('./types/compiler').SourceRecord;
type BindingRecord = import('./types/compiler').BindingRecord;
type Node = import('./types/compiler').Node;
type RootNode = import('./types/compiler').RootNode;
type ConstructNode = import('./types/compiler').ConstructNode;
type ClosureNode = import('./types/compiler').ClosureNode;
type TemplateNode = import('./types/compiler').TemplateNode;
type TextNode = import('./types/compiler').TextNode;
type TokenNode = import('./types/compiler').TokenNode;

/// Tokenizer Types

type TokenizerToken = import('./types/tokenizer').Token;
type TokenizerTokens = import('./types/tokenizer').Tokens;
type TokenizerMatch = import('./types/tokenizer').Match;
type TokenizerCapture = import('./types/tokenizer').Capture;
type TokenizerGroup = import('./types/tokenizer').Group;
type TokenizerGroups = import('./types/tokenizer').Groups;
type TokenizerGoal = import('./types/tokenizer').Goal;
type TokenizerContext = import('./types/tokenizer').Context;
type TokenizerContexts = import('./types/tokenizer').Contexts;
type TokenizerState = import('./types/tokenizer').State;

type DescribedPropertyType<D extends PropertyDescriptor = {value: F}, F = any> = D['get'] extends Function
	? ReturnType<D['get']>
	: D['value'];

type DescribedType<D extends PropertyDescriptorMap = {}> = {[K in keyof D]: DescribedPropertyType<D[K]>};

// declare global {
// 	interface Symbol {
// 		description: string;
// 	}
// }

// type ReadonlyPropertyDescription = PropertyDecorator & ({get: () => any; set: undefined} | {writable: false});

// type DefinedProperty<K extends PropertyKey, P = PropertyDescriptor, V extends {} = {}> = V &
// 	(P extends ReadonlyPropertyDescription ? {readonly [K]: DescribedType<P>} : {[K]: DescribedType<P>});

// type DescribedTypes<M = PropertyDescriptorMap, V extends {} = {}> = V & {[K in keyof M]: DescribedType<M[K]>};

// /**
//  * @template V
//  * @typedef {() => V} Getter
//  */

// /**
//  * @template {PropertyDescriptor} T
//  * @typedef {T['get'] extends undefined ? T['value'] : ReturnType<T['get']>} Described
//  */

// /**
//  * @template {{}} T
//  * @template {PropertyDescriptorMap} U
//  * @typedef {T & { [k in keyof U]: U[k]['get'] extends Getter<any> ? ReturnType<U[k]['get']> : U[k]['value'] }} DefinedProperties
//  */
