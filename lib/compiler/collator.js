//@ts-check
/// <reference path="./types.d.js"

import {Root, Construct, Closure, Template} from './constructs.js';

export const Collator = (() => {
	const {RETAIN_TOKEN_CONTEXTS = false} = Root;
	// const {currentConstruct} = Construct;

	return class Collator {
		/** @param {string} goal */
		constructor(goal) {
			this.goal = goal;
			this.declarations = [];
			this.faults = [];
			this.tokenContextMap = new WeakMap();
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
				this.tokenContextMap.set(
					(this.firstContext = this.lastContext = tokenContext),
					(this.lastNode = node = this.rootNode = this.firstNode = new Root(token.goal.name)),
				);
				RETAIN_TOKEN_CONTEXTS === true && (node.context = tokenContext);
			} else if (
				(this.lastNode = node =
					(this.lastContext === tokenContext && this.lastNode) || this.tokenContextMap.get(tokenContext)) !== undefined
			) {
				this.lastContext = tokenContext;
			} else {
				/** @type {string} */
				let flatNodeType;
				this.lastNode = node = this.tokenContextMap.get(this.lastContext);

				switch ((flatNodeType = token.punctuator)) {
					case 'quote':
						flatNodeType = 'string';
						if (token.group.opener === '`') break;
					case 'comment':
					case 'pattern':
						const child = node.appendText(this.flatten(token, tokens), flatNodeType);
						child.firstToken = token;
						child.lastToken = this.lastToken;
						return child;
					case undefined:
						break;
					default:
						this.throw(
							new Error(
								`Invalid delimiter: ${flatNodeType} [${token.goal.name}:${token.lineNumber}:${token.columnNumber}]`,
							),
						);
				}

				this.tokenContextMap.set(
					(this.lastContext = tokenContext),
					node.appendChild(
						(this.lastNode = node =
							flatNodeType === 'string' ? new Template() : new Closure(`${token.group.opener}…${token.group.closer}`)),
					),
				);
				RETAIN_TOKEN_CONTEXTS === true && (node.context = tokenContext);
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

			construct = node[Construct.currentConstruct];

			switch ((type = token.type)) {
				case 'inset':
				case 'whitespace':
					return node.appendText(token.text, token.type);
				case 'number':
				case 'identifier':
					node[Construct.currentConstruct] = undefined;
					break;
				case 'break':
					node.lastBreak = token;
					// TODO: GeneratorMethod
					if (construct !== undefined && construct.endsWith('async')) {
						node[Construct.currentConstruct] = undefined;
					}
					type = 'break';
					break;
				case 'operator': {
					node.lastOperator = token;
					switch (token.text) {
						case '*':
							if (construct !== undefined && construct.endsWith('function')) {
								node[Construct.currentConstruct] += '*';
								// TODO: GeneratorMethod
								break;
							}
						case '.':
						case ',':
						case ':':
						case ';':
						case '=':
							node[Construct.currentConstruct] = undefined;
							type = token.text;
							break;
						default:
							node[Construct.currentConstruct] = undefined;
					}
					break;
				}
				case 'keyword': {
					node.lastKeyword = token;
					switch (token.text) {
						case 'import':
						case 'export':
							type = node[Construct.currentConstruct] = token.text;
							break;
						case 'default':
							if (construct !== 'export') break;
						case 'async':
						case 'const':
						case 'var':
						case 'let':
							type = token.text;
							node[Construct.currentConstruct] =
								construct === 'import' || construct === 'export' ? `${construct} ${token.text}` : token.text;
							break;
						case 'function':
						case 'class':
							type = token.text;
							node[Construct.currentConstruct] = construct === undefined ? token.text : `${construct} ${token.text}`;
							break;
						default:
							node[Construct.currentConstruct] = undefined;
					}
					break;
				}
			}

			if (node[Construct.currentConstruct] !== construct) {
				if (this.currentConstructNode === undefined && node[Construct.currentConstruct] !== undefined) {
					const constructNode = (this.lastNode = this.currentConstructNode = new Construct());
					RETAIN_TOKEN_CONTEXTS === true && (constructNode.context = tokenContext);
					node.rootNode.constructs.push(constructNode);
					node.appendChild(constructNode);
					constructNode[Construct.currentConstruct] = node[Construct.currentConstruct];
					constructNode.appendToken(token, (constructNode.text = token.text));
					node[Construct.currentConstruct] = undefined;

					while (this.currentConstructNode === constructNode) {
						token = tokens.next().value;
						if (token.isDelimiter) break;
						if (this.collate(token, tokens) !== undefined) {
							constructNode[Symbol.toStringTag] = `Construct ⟨${(constructNode.nodeType =
								constructNode[Construct.currentConstruct])}⟩`;
							constructNode.text += token.text;
							token = undefined;
						}
					}
					this.currentConstructNode = undefined;
					this.queuedToken = token;
					this.lastNode = node;
					this.lastContext = tokenContext;
					return constructNode;
				} else {
					if (this.currentConstructNode === node && node[Construct.currentConstruct] === undefined) {
						// this.log('construct: %O -> %O', construct, node[symbols.Construct], token);
						this.currentConstructNode = undefined;
						return;
					}
				}
			}

			return node.appendToken(token, type);
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
