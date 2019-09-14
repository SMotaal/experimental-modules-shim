//@ts-check
/// <reference path="./types.d.ts" />

import {Node, Root, Construct, Closure, Template, Token} from './tree.js';
import * as symbols from './symbols.js';
import {constructors} from './constructs.js';

export const Collator = (() => {
	const {RETAIN_TOKEN_CONTEXTS = false} = Root;

	return class Collator {
		/**
		 * Collates tokens into construct-aligned syntax trees (CAST)
		 * @param {string} goal - only ECMAScript (for now)
		 */
		constructor(goal) {
			this.goal = goal;

			/** Incremented with every append operation */
			this.nodeCount = 0;

			/** Incremented with every token iteration */
			this.tokenCount = 0;

			// TODO: Keep either rootNode or firstNode, right?
			/** The top-level node retained for the full parse @type {Root} */
			this.rootNode = undefined;

			/** The top-level node retained for the full parse @type {Root} */
			this.firstNode = undefined;

			/** The edges of the collated tree @type {Node} */
			this.lastNode = undefined;

			/** The edges of the generated tokens @type {TokenizerToken} */
			this.firstToken = this.lastToken = this.nextToken = undefined;

			/** Back-pressure token passed to next node @type {TokenizerToken} */
			this.queuedToken = undefined;

			/** Tokenizer-provided context state @type {TokenizerContext} */
			this.firstContext = this.lastContext = undefined;

			/** The construct currently being formed @type {Construct} */
			this.currentConstructNode = undefined;

			/** Overridable logger function */
			this.log = console.log;
		}

		/** @param {TokenizerToken} token @param {TokenizerTokens} tokens */
		collate(token, tokens) {
			/** @type {Root | Closure} */
			let currentNode;
			/** @type {TokenizerContext} */
			let tokenContext;

			/** @type {ConstructNode} */
			let constructNode;

			this.nextToken = token.state.nextToken;

			this.queuedToken === undefined ||
				(token === this.queuedToken
					? (this.queuedToken = undefined)
					: this.throw(
							new Error(
								`Invalid token: expecting queued token  [${token.goal.name}:${token.lineNumber}:${token.columnNumber}]`,
							),
					  ));

			this.lastToken = token;

			if (this.node(token) === undefined) {
				currentNode = this.lastNode;
				tokenContext = token.context || token.state.lastTokenContext;

				switch (token.punctuator) {
					case 'pattern':
						return this.emitFlatNode(token, tokens, 'pattern');
					case 'comment':
						return this.emitFlatNode(token, tokens, 'comment');
					case 'quote':
						if (token.group.opener === '"' || token.group.opener === "'") {
							return this.emitFlatNode(token, tokens, 'string');
						}
						currentNode.appendToken((currentNode = new Template()));
						break;
					case undefined:
						currentNode.appendToken((currentNode = new Closure(`${token.group.opener}…${token.group.closer}`)));
						if ((constructNode = currentNode[Node.previousTokenNode]) !== undefined) {
							if ('{' === token.text) {
								// if (constructNode[symbols.BlockConstruct] === null) {
								if (constructNode[symbols.BindingConstruct] === null) {
									constructNode[symbols.BlockConstruct] = currentNode;

									constructNode[symbols.BindingClause] = currentNode;

									constructNode[symbols.BindingConstruct] = currentNode[symbols.BindingConstruct] = constructNode;
								} else if (constructNode[symbols.ClassBody] === null) {
									constructNode[symbols.BlockConstruct] = currentNode;

									currentNode[symbols.ClassConstruct] = constructNode;

									constructNode[symbols.ClassBody] = currentNode[symbols.ClassBody] = currentNode;
								} else if (
									constructNode[symbols.FunctionConstruct] != null &&
									constructNode[symbols.FunctionConstruct][symbols.FunctionBody] === null
								) {
									(constructNode = currentNode[symbols.FunctionConstruct] = constructNode[symbols.FunctionConstruct])[
										symbols.BlockConstruct
									] = currentNode;

									currentNode[symbols.FunctionConstruct] = constructNode;

									constructNode[symbols.FunctionBody] = (currentNode[symbols.FunctionArguments] =
										constructNode[symbols.ArgumentConstruct])[symbols.FunctionBody] = currentNode[
										symbols.FunctionBody
									] = currentNode;
								} else {
									// debugger;
								}
								// }
							} else if ('(' === token.text) {
								if (constructNode[symbols.ArgumentConstruct] === null) {
									constructNode[symbols.ArgumentConstruct] = currentNode;
									if (constructNode[symbols.FunctionArguments] === null) {
										currentNode[symbols.FunctionConstruct] = constructNode;
										currentNode[symbols.FunctionBody] = currentNode[symbols.BlockConstruct] = null;
										constructNode[symbols.FunctionArguments] = currentNode;
									} else {
										debugger;
									}
								}
							}
						}
						break;
					default:
						(token.punctuator === 'opener' && token.goal.name === this.goal) ||
							this.throw(
								new Error(
									`Invalid delimiter: ${token.punctuator} [${token.goal.name}:${token.lineNumber}:${token.columnNumber}]`,
								),
							);
				}

				(this.lastContext = tokenContext)[symbols.ContextNode] = this.lastNode = currentNode;
			}

			return this.emitTokenNode(token, tokens);
		}

		/** @param {TokenizerToken} token */
		node(token) {
			/** @type {Root | Closure} */
			let currentNode;
			/** @type {TokenizerContext} */
			let tokenContext;
			tokenContext = token.context || token.state.lastTokenContext;

			if (this.firstNode === undefined) {
				this.firstToken = token;
				(this.firstContext = this.lastContext = tokenContext)[
					symbols.ContextNode
				] = this.lastNode = currentNode = this.rootNode = this.firstNode = new Root(token.goal.name);
			}
			// Are we building a construct?
			else if (this.currentConstructNode !== undefined) {
				currentNode = this.currentConstructNode;
			}
			// Are we where we want to be?
			else if (
				(this.lastNode = currentNode =
					(this.lastContext === tokenContext && this.lastNode) || tokenContext[symbols.ContextNode]) !== undefined
			) {
				this.lastContext = tokenContext;
			} else if ((this.lastNode = this.lastContext[symbols.ContextNode]) === undefined) {
				this.throw(
					new Error(
						`Invalid state: lastContext = ${this.lastContext && this.lastContext.number} [${token.goal.name}:${
							token.lineNumber
						}:${token.columnNumber}]`,
					),
				);
			}

			return currentNode;
		}

		/** @param {TokenizerToken} token @param {TokenizerTokens} tokens */
		emitConstructNode(token, tokens) {
			/** @type {Root | Closure} */
			let currentNode;
			/** @type {Construct} */
			let constructNode;

			currentNode = this.lastNode;
			constructNode = this.lastNode = this.currentConstructNode = new Construct();

			if (token.text in constructors) constructors[token.text](constructNode);
			RETAIN_TOKEN_CONTEXTS && (constructNode[Node.tokenContext] = this.lastContext);
			currentNode[Node.rootNode].constructs.push(constructNode);
			currentNode.appendToken(constructNode);
			constructNode[Node.construct] = currentNode[Node.construct];
			currentNode[Node.construct] = '';
			constructNode.appendToken(new Token(token, token.text));

			for (
				;
				this.currentConstructNode === constructNode &&
				(token = tokens.next().value) !== undefined &&
				token.isDelimiter !== true;
				this.collate(token, tokens) === undefined ||
				((constructNode.type = constructNode[Node.construct]), (token = undefined))
			);

			constructNode[Symbol.toStringTag] = `${constructNode[Symbol.toStringTag]} ⟨${constructNode.type}⟩`;
			constructNode[Node.construct] = '';
			this.currentConstructNode = undefined;
			this.queuedToken = token;
			this.lastNode = currentNode;

			return constructNode;
		}

		/** @param {TokenizerToken} token @param {TokenizerTokens} tokens @param {string} type */
		emitFlatNode(token, tokens, type) {
			const {contextDepth, state} = token;
			const fragments = [token.text];
			while ((this.nextToken = state.nextToken).contextDepth >= contextDepth) {
				fragments.push((this.lastToken = tokens.next().value).text);
			}
			const child =
				type === 'comment'
					? this.lastNode.appendComment(fragments.join(''), type)
					: this.lastNode.appendLiteral(fragments.join(''), type);
			child.firstToken = token;
			child.lastToken = this.lastToken;
			return child;
		}

		/** @param {TokenizerToken} token @param {TokenizerTokens} tokens */
		emitTokenNode(token, tokens) {
			/** @type {string} */
			let type;
			/** @type {symbol} */
			let symbol;
			/** @type {(typeof constructors)[keyof (typeof constructors)]} */
			let constructor;

			let constructNode;
			const currentNode = (constructNode = this.lastNode);
			const currentConstructText = currentNode[Node.construct];

			switch ((type = token.type)) {
				case 'inset':
				case 'whitespace':
					return currentNode.appendText(token.text, token.type);
				// case 'default':
				case 'identifier':
					if ((constructNode = currentNode)[symbols.BindingClause] === null) {
						symbol = symbols.BindingClause;
						break;
					} else if ((constructNode = currentNode) && constructNode[symbols.ExtendsClause] === null) {
						symbol = symbols.ExtendsClause;
						break;
					} else {
						// debugger;
					}
				case 'number':
					currentNode[Node.construct] = '';
					break;
				case 'break':
					currentNode[Node.lastBreak] = token;
					// TODO: GeneratorMethod
					if (currentConstructText.endsWith('async')) {
						currentNode[Node.construct] = '';
					}
					type = 'break';
					break;
				case 'operator':
					currentNode[Node.lastOperator] = token;
					switch (token.text) {
						// case '*':
						// if (currentConstructText.endsWith('function')) {
						// 	currentNode[Node.construct] += '*';
						// 	break;
						// }
						case '.':
						case ',':
						case ':':
						case ';':
						case '=':
							currentNode[Node.construct] = '';
							type = token.text;
							break;
						default:
							currentNode[Node.construct] = '';
					}
					break;
				case 'keyword':
					currentNode[Node.lastKeyword] = token;

					switch (token.text) {
						case '*':
							if (currentConstructText.endsWith('function')) {
								currentNode[Node.construct] += '*';
								break;
							}
						case 'import':
							type = currentNode[Node.construct] = token.text;
							constructor = constructors[token.text];
							break;
						case 'export':
							token.contextDepth
								? (currentNode[Node.construct] = '')
								: (type = currentNode[Node.construct] = token.text);
							constructor = constructors[token.text];
							break;
						case 'const':
						case 'var':
						case 'let':
							constructor = constructors[token.text];
						case 'default':
							if (currentConstructText !== 'export') {
								type = token.text;
								currentNode[Node.construct] = '';
								break;
							}
						case 'async':
							type = token.text;
							currentNode[Node.construct] =
								currentConstructText === 'import' || currentConstructText === 'export'
									? `${currentNode[Node.construct]} ${token.text}`
									: token.text;
							break;
						case 'function':
						case 'class':
							constructor = constructors[token.text];
							type = token.text;
							currentNode[Node.construct] =
								currentConstructText === '' ? token.text : `${currentNode[Node.construct]} ${token.text}`;
							break;
						case 'extends':
							if (
								currentNode[symbols.ClassConstruct] !== undefined &&
								currentNode[symbols.ExtendsClause] === undefined
							) {
								type = token.text;
								currentNode[symbols.ExtendsClause] = null;
								break;
							}
						default:
							currentNode[Node.construct] = '';
					}
					break;
			}

			if (constructor !== undefined && constructor.symbol in currentNode) debugger;
			if (currentConstructText !== currentNode[Node.construct]) {
				if (this.currentConstructNode === undefined) {
					return this.emitConstructNode(token, tokens);
				} else if (this.currentConstructNode === currentNode) {
					if (currentNode[Node.construct] === '') {
						if (symbol) debugger;
						return (this.currentConstructNode = undefined);
					}
				}
				if (constructor) constructor(currentNode);
			}

			const tokenNode = currentNode.appendToken(new Token(token, type));

			if (symbol !== undefined) {
				constructNode[symbol] = tokenNode;
				switch (symbol) {
					case symbols.BindingClause:
						constructNode[symbols.BindingConstruct] = constructNode;
						break;
				}
			}

			return tokenNode;
		}

		throw(error) {
			throw error;
		}
	};
})();
