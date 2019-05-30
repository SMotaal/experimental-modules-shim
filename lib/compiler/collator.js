//@ts-check
/// <reference path="./types.d.ts" />

import {Node, Root, Construct, Closure, Template, Token} from './constructs.js';

export const Collator = (() => {
	const {RETAIN_TOKEN_CONTEXTS = false} = Root;
	// const {currentConstruct} = Construct;

	return class Collator {
		/** @param {string} goal */
		constructor(goal) {
			this.goal = goal;
			this.declarations = [];
			this.faults = [];
			this.contextNodeMap = new WeakMap();
			this.nodeCount = 0;
			this.tokenCount = 0;
			/** @type {Root} */
			this.rootNode = undefined;
			/** @type {Root | Closure} */
			this.firstNode = this.lastNode = undefined;
			/** @type {TokenizerToken} */
			this.firstToken = this.lastToken = this.nextToken = this.queuedToken = undefined;
			/** @type {TokenizerContext} */
			this.firstContext = this.lastContext = undefined;
			/** @type {Construct} */
			this.currentConstructNode = undefined;
			// /** @type {string} */
			// this[symbols.Construct]= undefined;
			this.log = console.log;
		}

		/** @param {TokenizerToken} token @param {TokenizerTokens} tokens */
		collate(token, tokens) {
			/** @type {Root | Closure} */
			let node;
			/** @type {string} */
			let construct;
			/** @type {string} */
			let type;
			/** @type {TokenizerContext} */
			let tokenContext;

			this.nextToken = token.state.nextToken;

			if (this.queuedToken !== undefined) {
				if (token !== this.queuedToken)
					this.throw(
						new Error(
							`Invalid token: expecting queued token  [${token.goal.name}:${token.lineNumber}:${token.columnNumber}]`,
						),
					);
				this.queuedToken = undefined;
			}

			tokenContext = token.state.lastTokenContext;

			if (this.currentConstructNode !== undefined) {
				node = this.currentConstructNode;
			} else if (this.firstNode === undefined) {
				this.firstToken = token;
				this.contextNodeMap.set(
					(this.firstContext = this.lastContext = tokenContext),
					(this.lastNode = node = this.rootNode = this.firstNode = new Root(token.goal.name)),
				);
				RETAIN_TOKEN_CONTEXTS === true && (node.context = tokenContext);
			} else if (
				(this.lastNode = node =
					(this.lastContext === tokenContext && this.lastNode) || this.contextNodeMap.get(tokenContext)) !== undefined
			) {
				this.lastContext = tokenContext;
			} else {
				/** @type {Node} */
				let child;
				this.lastNode = node = this.contextNodeMap.get(this.lastContext);

				if (node === undefined) {
					this.throw(
						new Error(
							`Invalid state: lastContext = ${this.lastContext && this.lastContext.number} [${token.goal.name}:${
								token.lineNumber
							}:${token.columnNumber}]`,
						),
					);
				}

				switch (token.punctuator) {
					case undefined:
						// debugger;
						// if (!token.group) break;
						// TODO: Figure out why a single line comment throws
						child = node.appendToken((node = new Closure(`${token.group.opener}…${token.group.closer}`)));
						break;
					case 'quote':
						child =
							token.group.opener === '`'
								? node.appendToken((node = new Template()))
								: node.appendLiteral(this.flatten(token, tokens), 'string');
						break;
					case 'pattern':
						child = node.appendLiteral(this.flatten(token, tokens), 'pattern');
						break;
					case 'comment':
						child = node.appendComment(this.flatten(token, tokens), 'comment');
						break;
					default:
						this.throw(
							new Error(
								`Invalid delimiter: ${token.punctuator} [${token.goal.name}:${token.lineNumber}:${token.columnNumber}]`,
							),
						);
				}
				if (child !== undefined) {
					if (node === child) {
						this.contextNodeMap.set((this.lastContext = tokenContext), (this.lastNode = node));
						RETAIN_TOKEN_CONTEXTS === true && (node.context = tokenContext);
					} else {
						child.firstToken = token;
						child.lastToken = this.lastToken;
						return child;
					}
				}
			}

			(this.lastContext === tokenContext && this.lastNode === node) ||
				this.throw(
					new Error(
						`Invalid ${
							this.lastContext !== tokenContext
								? `context: ${tokenContext && `${tokenContext.id}[${tokenContext.number}]`} !== ${this.lastContext &&
										`${this.lastContext.id}[${this.lastContext.number}]`}`
								: `node:`
						} [${token.goal.name}:${token.lineNumber}:${token.columnNumber}]`,
					),
				);

			this.lastToken = token;

			construct = node[Node.construct];

			switch ((type = token.type)) {
				case 'inset':
				case 'whitespace':
					return node.appendText(token.text, token.type);
				case 'number':
				case 'identifier':
					node[Node.construct] = undefined;
					break;
				case 'break':
					node[Node.lastBreak] = token;
					// TODO: GeneratorMethod
					if (construct !== undefined && construct.endsWith('async')) {
						node[Node.construct] = undefined;
					}
					type = 'break';
					break;
				case 'operator': {
					node[Node.lastOperator] = token;
					switch (token.text) {
						case '*':
							if (construct !== undefined && construct.endsWith('function')) {
								node[Node.construct] += '*';
								// TODO: GeneratorMethod
								break;
							}
						case '.':
						case ',':
						case ':':
						case ';':
						case '=':
							node[Node.construct] = undefined;
							type = token.text;
							break;
						default:
							node[Node.construct] = undefined;
					}
					break;
				}
				case 'keyword': {
					node[Node.lastKeyword] = token;
					switch (token.text) {
						case 'import':
						case 'export':
							type = node[Node.construct] = token.text;
							break;
						case 'default':
							if (construct !== 'export') break;
						case 'async':
						case 'const':
						case 'var':
						case 'let':
							type = token.text;
							node[Node.construct] =
								construct === 'import' || construct === 'export' ? `${construct} ${token.text}` : token.text;
							break;
						case 'function':
						case 'class':
							type = token.text;
							node[Node.construct] = construct === undefined ? token.text : `${construct} ${token.text}`;
							break;
						default:
							node[Node.construct] = undefined;
					}
					break;
				}
			}

			if (node[Node.construct] !== construct) {
				if (this.currentConstructNode === undefined && node[Node.construct] !== undefined) {
					const constructNode = (this.lastNode = this.currentConstructNode = new Construct());
					RETAIN_TOKEN_CONTEXTS === true && (constructNode.context = tokenContext);
					node[Node.rootNode].constructs.push(constructNode);
					node.appendToken(constructNode);
					constructNode[Node.construct] = node[Node.construct];
					constructNode.appendToken(new Token(token, token.text));
					// constructNode.appendToken(new Token(token, token.text));
					node[Node.construct] = undefined;

					while (this.currentConstructNode === constructNode) {
						token = tokens.next().value;
						if (token.isDelimiter) break;

						this.collate(token, tokens) !== undefined &&
							((constructNode.nodeType = constructNode[Node.construct]), (token = undefined));
						// if (this.collate(token, tokens) !== undefined) {
						// 	constructNode[Symbol.toStringTag] = `Construct ⟨${(constructNode.nodeType =
						// 		constructNode[Node.currentConstruct])}⟩`;
						// 	// constructNode.text += token.text;
						// 	token = undefined;
						// }
					}
					constructNode[Symbol.toStringTag] = `Construct ⟨${constructNode.nodeType}⟩`;
					this.currentConstructNode = undefined;
					this.queuedToken = token;
					this.lastNode = node;
					this.lastContext = tokenContext;

					return constructNode;
				} else {
					if (this.currentConstructNode === node && node[Node.construct] === undefined) {
						// this.log('construct: %O -> %O', construct, node[symbols.Construct], token);
						this.currentConstructNode = undefined;
						return;
					}
				}
			}

			return node.appendToken(new Token(token, type));
		}

		throw(error) {
			throw error;
		}

		flatten(token, tokens) {
			const {contextDepth, state} = token;
			const text = [token.text];
			while ((this.nextToken = state.nextToken).contextDepth >= contextDepth) {
				text.push((this.lastToken = tokens.next().value).text);
			}
			return text.join('');
		}
	};
})();
