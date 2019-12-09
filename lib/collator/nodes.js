//@ts-check
/// <reference path="./types.d.ts" />

import * as symbols from './symbols.js';
import {environment} from '../environment.js';

export const {Node, Root, Construct, Closure, Template, Text, Token} = (() => {
	const FORCE_INCOMPLETE_CONSTRUCTS = true;

	// const {defineProperty} = Object;
	class Node {
		/** @param {string} [type] */
		constructor(type) {
			/** @type {string} */
			this.text = undefined;

			this.type = type;

			this[Symbol.toStringTag] = type == null ? new.target.name : `${new.target.name} ⟨${type}⟩`;

			/** @type {TokenizerToken} */
			this.token = undefined;

			/** @type {TokenizerContext} */
			this[Node.tokenContext] = undefined;

			/** @type {RootNode} */
			this[Node.rootNode] = undefined;

			/** @type {ParentNode} */
			this[Node.parentNode] = undefined;

			/** @type {Node} */
			this[Node.previousNode] = this[Node.nextNode] = undefined;

			/** @type {TokenNode|ParentNode} */
			this[Node.previousTokenNode] = this[Node.nextTokenNode] = undefined;

			/** @type {Node[]} */
			this.children = undefined;

			/** @type {Node} */
			this.firstNode = this.lastNode = undefined;

			/** @type {TokenNode} */
			this.firstTokenNode = this.lastTokenNode = undefined;

			/** @type {TokenizerToken} */
			this.firstToken = this.lastToken = undefined;

			/** @type {TokenizerToken} */
			this[Node.lastKeyword] = this[Node.lastOperator] = this[Node.lastBreak] = undefined;

			/** @type {string} */
			this[Node.construct] = '';

			/** @type {Construct[]} */
			this.constructs = undefined;
		}
	}

	Node.prototype.symbols = symbols;

	class Text extends Node {
		/** @param {string} text @param {string} type */
		constructor(text, type) {
			super(type);
			this.text = text;
		}
	}

	class Token extends Node {
		/** @param {TokenizerToken} token @param {string} [type] */
		constructor(token, type) {
			super((type == null && token.type) || type);
			this.text = token.text;
			this.token = this.firstToken = this.lastToken = token;
		}
	}

	class Parent extends Node {
		set lastToken(lastToken) {}

		get lastToken() {
			return this.lastTokenNode && this.lastTokenNode.lastToken;
		}

		set firstToken(firstToken) {}

		get firstToken() {
			return this.firstTokenNode && this.firstTokenNode.firstToken;
		}

		set text(text) {}

		get text() {
			/** @type {string[]} */
			let fragments;
			/** @type {Node} */
			let node;
			const {firstNode, lastNode} = this;
			if (firstNode === undefined) return '';
			if (firstNode === lastNode) return firstNode.text;

			fragments = [(node = firstNode).text];
			while ((node = node[Node.nextNode]) !== lastNode) {
				fragments.push(node.text || '');
			}
			node === lastNode && fragments.push(node.text || '');
			return fragments.join('');
		}

		/**
		 * @template {Node} T
		 * @param {T} child
		 * @returns T
		 */
		appendChild(child) {
			child[Node.previousNode] = this.lastNode;
			this.children === undefined
				? (this.children = [(this.firstNode = child)])
				: this.children.push((this.lastNode[Node.nextNode] = child));
			(child[Node.rootNode] = (child[Node.parentNode] = this)[Node.rootNode]).nodeCount++;
			child[Node.previousTokenNode] = this.lastTokenNode;

			return (this.lastNode = child);
		}

		/** @param {ParentNode|TokenNode|TextNode} child */
		appendToken(child) {
			const {lastTokenNode, lastNode} = this;
			this.appendChild(child);
			(child[Node.previousTokenNode] = lastTokenNode) === undefined
				? (child.firstToken && (this.firstToken = child.token), (this.firstTokenNode = child))
				: (child[Node.previousTokenNode][Node.nextTokenNode] = child);
			if (lastTokenNode !== undefined && lastTokenNode !== lastNode) {
				/** @type {Node} */
				let node = this.lastTokenNode;
				while ((node = node[Node.nextNode]) !== lastNode) node[Node.nextTokenNode] = child;
				node[Node.nextTokenNode] = child;
			}
			child.lastToken && (this.lastToken = child.lastToken);
			this.lastTokenNode = child;
			return child;
		}

		/** @param {string} text @param {string} type */
		appendText(text, type) {
			return this.appendChild(new Text(text, type));
		}

		/** @param {string} text @param {string} type */
		appendComment(text, type) {
			return this.appendChild(new Comment(text, type));
		}

		/** @param {string} text @param {string} type */
		appendLiteral(text, type) {
			return this.appendToken(new Literal(text, type));
		}
	}

	class Root extends Parent {
		/** @param {string} [type] */
		constructor(type) {
			super(type);
			this[Node.rootNode] = this;
			/** @type {ConstructNode[]} */
			this.constructs = [];

			// Only unique property
			this.nodeCount = 0;
		}
	}

	class Literal extends Text {}
	class Comment extends Text {}
	class Closure extends Parent {}
	class Template extends Parent {}
	class Construct extends Parent {
		/** @param {*} record */
		initializeDeclarationRecord(record) {
			const construct = this;
			const {NextTokenNode, BindingClause} = construct.symbols;
			/** @type {ContentNode|ParentNode} */
			let node;
			node = construct[NextTokenNode];
			// node = construct.firstTokenNode[NextTokenNode] || construct[NextTokenNode];
			// node = construct.firstTokenNode[NextTokenNode];
			const bindingTarget = construct[BindingClause] != null ? construct[BindingClause].text : undefined;
			const nodes = [node];
			const next = (next = node[NextTokenNode]) => (nodes.push(next), next);
			let error;
			const declarations = []; // (record.declarations = []);
			switch (record.bindingDeclaration) {
				case 'FunctionDeclaration':
				case 'AsyncFunctionDeclaration':
				case 'GeneratorFunctionDeclaration':
				case 'AsyncGeneratorFunctionDeclaration':
				case 'ClassDeclaration':
					const bindingDeclaration = {};
					if (node.type !== 'identifier') {
						error = {
							type: 'ConstructError',
							message: `${record.bindingDeclaration} must have a valid identifier`,
							lineNumber: construct.lastToken.lineNumber,
							columnNumber: construct.lastToken.columnNumber,
						};
						if (!FORCE_INCOMPLETE_CONSTRUCTS) break;
					}
					bindingDeclaration.internalIdentifier = bindingTarget;
					bindingDeclaration.internalType =
						bindingDeclaration.bindingDeclaration === 'ClassDeclaration' ? 'class' : 'function';
					if (record.bindingIntent === 'export') {
						bindingDeclaration.exportedIdentifier = bindingDeclaration.internalIdentifier;
						bindingDeclaration.exportedType = 'readonly';
					}
					declarations.push(bindingDeclaration);
					break;
				case 'VariableDeclaration':
					const variableDeclaration = {};
					variableDeclaration.internalType = record.declarationText;
					if (node.type === '{…}') {
						// TODO: Destructure bindings
						if (!FORCE_INCOMPLETE_CONSTRUCTS) break;
					} else if (node.type === 'identifier') {
						variableDeclaration.internalIdentifier = bindingTarget;
						if (record.bindingIntent === 'export') {
							variableDeclaration.exportedIdentifier = variableDeclaration.internalIdentifier;
							variableDeclaration.exportedType = variableDeclaration.internalType === 'const' ? 'constant' : 'readonly';
						}
					}
					declarations.push(variableDeclaration);
					break;
				case 'ExportDefaultAssignmentExpression':
					const exportDeclaration = {};
					exportDeclaration.exportedType = 'constant';
					exportDeclaration.internalType = 'void';
					exportDeclaration.exportedIdentifier = 'default';
					declarations.push(exportDeclaration);
					break;
				case 'ImportDeclaration':
					if (node.type !== 'string') {
						if (node.text === '*') {
							const importDeclaration = {};
							importDeclaration.importedIdentifier = '*';
							importDeclaration.internalIdentifier = bindingTarget;
							node = next();
							if (node.text === 'as' && (node = next()).type === 'identifier') {
								importDeclaration.internalIdentifier = node.text;
								node = next();
							} else {
								error = {
									type: 'ConstructError',
									message: `${record.bindingDeclaration} must have a valid bindings`,
									lineNumber: node.firstToken.lineNumber,
									columnNumber: node.firstToken.columnNumber,
								};
								break;
							}
							declarations.push(importDeclaration);
						} else if (node.type === 'identifier') {
							const importDeclaration = {};
							importDeclaration.importedIdentifier = 'default';
							importDeclaration.internalIdentifier = bindingTarget;
							node = next();

							if (node.text !== 'from') {
								if (node.text === ',' && (node = next()).type === '{…}') {
									importDeclaration.internalIdentifier = node.text;
									node = next();
								} else {
									error = {
										type: 'ConstructError',
										message: `${record.bindingDeclaration} must have a valid bindings`,
										lineNumber: node.firstToken.lineNumber,
										columnNumber: node.firstToken.columnNumber,
									};
									break;
								}
							}

							declarations.push(importDeclaration);
						}

						if (node.type === '{…}') {
							// TODO: import {…}
							if (!FORCE_INCOMPLETE_CONSTRUCTS) break;
							while ((node = next())) {
								if (node.type === 'identifier') {
									const importDeclaration = {};
									importDeclaration.internalIdentifier = importDeclaration.importedIdentifier = node.text;
									node = next();
									if (node.text !== ',') {
										if (node.text === 'as' && (node = next()).type === 'identifier') {
											importDeclaration.internalIdentifier = node.text;
										} else {
											break;
										}
									}
									declarations.push(importDeclaration);
									if (node.text === ',') continue;
									break;
								}
							}
							if (node.text !== '}') {
								error = {
									type: 'ConstructError',
									message: `${record.bindingDeclaration} must have a valid bindings`,
									lineNumber: node.firstToken.lineNumber,
									columnNumber: node.firstToken.columnNumber,
								};
								break;
							}
						}

						if (node.text === 'from') node = next();
					}

					if (node.type === 'string') {
						record.externalModuleSpecifier = node.text.slice(1, -1);
					} else {
						error = {
							type: 'ConstructError',
							message: `${record.bindingDeclaration} must have a valid bindings`,
							lineNumber: node.firstToken.lineNumber,
							columnNumber: node.firstToken.columnNumber,
						};
						break;
					}

					// console.log({construct, nodes});
					break;
				case 'ExportDeclaration':
					if (node.text === '*') {
						record.exportedIdentifier = bindingTarget;
					} else if (node.type === '{…}') {
						// TODO: export {…}
						if (!FORCE_INCOMPLETE_CONSTRUCTS) break;
					}
					break;
			}
			return {record, error, declarations, nodes};
		}
	}

	Node.rootNode = symbols.RootNode;
	Node.parentNode = symbols.ParentNode;
	Node.nextNode = symbols.NextNode;
	Node.previousNode = symbols.PreviousNode;
	Node.nextTokenNode = symbols.NextTokenNode;
	Node.previousTokenNode = symbols.PreviousTokenNode;
	Node.construct = symbols.Construct;
	Node.trailer = symbols.Trailer;
	Node.lastKeyword = symbols.LastKeyword;
	Node.lastOperator = symbols.LastOperator;
	Node.lastBreak = symbols.LastBreak;
	Node.tokenContext = symbols.TokenContext;

	/** @type {boolean} */
	Node.RETAIN_TOKEN_CONTEXTS = true;

	if (environment.process) {
		const inspect = Symbol.for('nodejs.util.inspect.custom');
		Node.prototype[inspect] = {
			/** @this {Node} @param {number} depth @param {NodeJS.InspectOptions & {stylize: Function}} options*/
			[inspect](depth, {stylize}) {
				return `${stylize(this.constructor.name, 'undefined')} ‹${stylize(this.type, 'special')}›`;
			},
		}[inspect];

		// console.log(Text.prototype[inspect]);
		// process.exit();
	}

	((constructor, parentDescriptors, nodeDescriptors) => {
		({constructor, ...nodeDescriptors} = Object.getOwnPropertyDescriptors(Node.prototype));
		({constructor, ...parentDescriptors} = {...nodeDescriptors, ...Object.getOwnPropertyDescriptors(Parent.prototype)});
		for (const Node of [Root, Closure, Template, Construct, Token, Text, Literal, Comment, Parent]) {
			Object.defineProperties(Node.prototype, Parent.isPrototypeOf(Node) ? parentDescriptors : nodeDescriptors);
			Object.freeze(Object.setPrototypeOf(Node.prototype, null));
		}
	})();

	// NOTE: Safari/iOS throw with Object.setPrototypeOf(Node, null);
	Object.freeze(Node);

	return {Node, Root, Construct, Closure, Template, Text, Token};
})();

/** @typedef {ContentNode|ParentNode} Node */
/** @typedef {Text|Token} ContentNode */
/** @typedef {Text} TextNode */
/** @typedef {Token} TokenNode */
/** @typedef {Root|Construct|Closure|Template} ParentNode */
/** @typedef {Root} RootNode */
/** @typedef {Construct} ConstructNode */
/** @typedef {Closure} ClosureNode */
/** @typedef {Template} TemplateNode */
