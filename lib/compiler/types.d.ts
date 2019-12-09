//@ts-check

/// Generics

type DescribedPropertyType<D extends PropertyDescriptor = {value: F}, F = any> = D['get'] extends Function
	? ReturnType<D['get']>
	: D['value'];

type DescribedType<D extends PropertyDescriptorMap = {}> = {[K in keyof D]: DescribedPropertyType<D[K]>};

/// Records
declare module '@smotaal/experimental-modules-shim/records' {
	//@ts-check
	export type SourceRecord = import('./records').SourceRecord;
	export type BindingRecord = import('./records').BindingRecord;
}

type SourceRecord = import('@smotaal/experimental-modules-shim/records').SourceRecord;
type BindingRecord = import('@smotaal/experimental-modules-shim/records').BindingRecord;

/// Tokenizer

declare module '@smotaal/experimental-modules-shim/tokenizer' {
	export type Token = import('/markup/experimental/es/types').Token;
	export type Tokens = IterableIterator<Token>;
	export type Match = import('/markup/experimental/es/types').Match;
	export type Capture = import('/markup/experimental/es/types').Capture;
	export type Group = import('/markup/experimental/es/types').Group;
	export type Groups = import('/markup/experimental/es/types').Groups;
	export type Goal = import('/markup/experimental/es/types').Goal;
	export type Context = import('/markup/experimental/es/types').Context;
	export type Contexts = import('/markup/experimental/es/types').Contexts;
	export type State = import('/markup/experimental/es/types').State;
}

type TokenizerToken = import('@smotaal/experimental-modules-shim/tokenizer').Token;
type TokenizerTokens = import('@smotaal/experimental-modules-shim/tokenizer').Tokens;
type TokenizerMatch = import('@smotaal/experimental-modules-shim/tokenizer').Match;
type TokenizerCapture = import('@smotaal/experimental-modules-shim/tokenizer').Capture;
type TokenizerGroup = import('@smotaal/experimental-modules-shim/tokenizer').Group;
type TokenizerGroups = import('@smotaal/experimental-modules-shim/tokenizer').Groups;
type TokenizerGoal = import('@smotaal/experimental-modules-shim/tokenizer').Goal;
type TokenizerContext = import('@smotaal/experimental-modules-shim/tokenizer').Context;
type TokenizerContexts = import('@smotaal/experimental-modules-shim/tokenizer').Contexts;
type TokenizerState = import('@smotaal/experimental-modules-shim/tokenizer').State;
