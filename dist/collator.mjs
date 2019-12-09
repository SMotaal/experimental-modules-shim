import { e as environment } from './environment.mjs';

const Construct = Symbol('Node.construct');
const Trailer = Symbol('Node.trailer');
const NextNode = Symbol('Node.nextNode');
const PreviousNode = Symbol('Node.previousNode');
const NextTokenNode = Symbol('Node.nextTokenNode');
const PreviousTokenNode = Symbol('Node.previousTokenNode');
const ParentNode = Symbol('Node.parentNode');
const RootNode = Symbol('Node.rootNode');
const LastKeyword = Symbol('Node.lastKeyword');
const LastOperator = Symbol('Node.lastOperator');
const LastBreak = Symbol('Node.lastBreak');
const TokenContext = Symbol('Node.tokenContext');
const ContextNode = Symbol('Node.contextNode');

const FunctionConstruct = Symbol('Node.functionConstruct');
const ClassConstruct = Symbol('Node.classConstruct');
const VariableConstruct = Symbol('Node.variableConstruct');
const ImportConstruct = Symbol('Node.importConstruct');
const ExportConstruct = Symbol('Node.exportConstruct');
const BindingConstruct = Symbol('Node.bindingConstruct');

const ArgumentConstruct = Symbol('Node.argumentConstruct');
const BlockConstruct = Symbol('Node.blockConstruct');

const BindingClause = Symbol('Construct.bindingClause');
const ExtendsClause = Symbol('Construct.extendsClause');
const FromClause = Symbol('Construct.fromClause');
const ClassBody = Symbol('Construct.classBody');
const FunctionArguments = Symbol('Construct.functionArguments');
const FunctionBody = Symbol('Construct.functionBody');

const symbols = /*#__PURE__*/Object.freeze({
	__proto__: null,
	Construct: Construct,
	Trailer: Trailer,
	NextNode: NextNode,
	PreviousNode: PreviousNode,
	NextTokenNode: NextTokenNode,
	PreviousTokenNode: PreviousTokenNode,
	ParentNode: ParentNode,
	RootNode: RootNode,
	LastKeyword: LastKeyword,
	LastOperator: LastOperator,
	LastBreak: LastBreak,
	TokenContext: TokenContext,
	ContextNode: ContextNode,
	FunctionConstruct: FunctionConstruct,
	ClassConstruct: ClassConstruct,
	VariableConstruct: VariableConstruct,
	ImportConstruct: ImportConstruct,
	ExportConstruct: ExportConstruct,
	BindingConstruct: BindingConstruct,
	ArgumentConstruct: ArgumentConstruct,
	BlockConstruct: BlockConstruct,
	BindingClause: BindingClause,
	ExtendsClause: ExtendsClause,
	FromClause: FromClause,
	ClassBody: ClassBody,
	FunctionArguments: FunctionArguments,
	FunctionBody: FunctionBody
});

//@ts-check

const {Node, Root, Construct: Construct$1, Closure, Template, Text, Token} = (() => {

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
	class Construct$1 extends Parent {
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
					if (node.type === '{…}') ; else if (node.type === 'identifier') {
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
					} else if (node.type === '{…}') ;
					break;
			}
			return {record, error, declarations, nodes};
		}
	}

	Node.rootNode = RootNode;
	Node.parentNode = ParentNode;
	Node.nextNode = NextNode;
	Node.previousNode = PreviousNode;
	Node.nextTokenNode = NextTokenNode;
	Node.previousTokenNode = PreviousTokenNode;
	Node.construct = Construct;
	Node.trailer = Trailer;
	Node.lastKeyword = LastKeyword;
	Node.lastOperator = LastOperator;
	Node.lastBreak = LastBreak;
	Node.tokenContext = TokenContext;

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
		for (const Node of [Root, Closure, Template, Construct$1, Token, Text, Literal, Comment, Parent]) {
			Object.defineProperties(Node.prototype, Parent.isPrototypeOf(Node) ? parentDescriptors : nodeDescriptors);
			Object.freeze(Object.setPrototypeOf(Node.prototype, null));
		}
	})();

	// NOTE: Safari/iOS throw with Object.setPrototypeOf(Node, null);
	Object.freeze(Node);

	return {Node, Root, Construct: Construct$1, Closure, Template, Text, Token};
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

const constructors = {};

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
		FunctionConstruct,
		FunctionBody,
		FunctionArguments,
		BindingClause,
		ArgumentConstruct,
		BlockConstruct,
	);
	constructors.class = Constructor(
		ClassConstruct,
		ClassBody,
		BindingClause,
		BlockConstruct,
	);

	constructors.const = constructors.var = constructors.let = Constructor(
		VariableConstruct,
		BindingClause,
		BindingConstruct,
		BlockConstruct,
	);
	constructors.import = Constructor(
		ImportConstruct,
		FromClause,
		BindingClause,
		BindingConstruct,
		BlockConstruct,
	);
	constructors.export = Constructor(
		ExportConstruct,
		FromClause,
		BindingClause,
		BindingConstruct,
		BlockConstruct,
	);
}

//@ts-check

const Collator = (() => {
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
								if (constructNode[BindingConstruct] === null) {
									constructNode[BlockConstruct] = currentNode;

									constructNode[BindingClause] = currentNode;

									constructNode[BindingConstruct] = currentNode[BindingConstruct] = constructNode;
								} else if (constructNode[ClassBody] === null) {
									constructNode[BlockConstruct] = currentNode;

									currentNode[ClassConstruct] = constructNode;

									constructNode[ClassBody] = currentNode[ClassBody] = currentNode;
								} else if (
									constructNode[FunctionConstruct] != null &&
									constructNode[FunctionConstruct][FunctionBody] === null
								) {
									(constructNode = currentNode[FunctionConstruct] = constructNode[FunctionConstruct])[
										BlockConstruct
									] = currentNode;

									currentNode[FunctionConstruct] = constructNode;

									constructNode[FunctionBody] = (currentNode[FunctionArguments] =
										constructNode[ArgumentConstruct])[FunctionBody] = currentNode[
										FunctionBody
									] = currentNode;
								}
								// }
							} else if ('(' === token.text) {
								if (constructNode[ArgumentConstruct] === null) {
									constructNode[ArgumentConstruct] = currentNode;
									if (constructNode[FunctionArguments] === null) {
										currentNode[FunctionConstruct] = constructNode;
										currentNode[FunctionBody] = currentNode[BlockConstruct] = null;
										constructNode[FunctionArguments] = currentNode;
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

				(this.lastContext = tokenContext)[ContextNode] = this.lastNode = currentNode;
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
					ContextNode
				] = this.lastNode = currentNode = this.rootNode = this.firstNode = new Root(token.goal.name);
			}
			// Are we building a construct?
			else if (this.currentConstructNode !== undefined) {
				currentNode = this.currentConstructNode;
			}
			// Are we where we want to be?
			else if (
				(this.lastNode = currentNode =
					(this.lastContext === tokenContext && this.lastNode) || tokenContext[ContextNode]) !== undefined
			) {
				this.lastContext = tokenContext;
			} else if ((this.lastNode = this.lastContext[ContextNode]) === undefined) {
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
			constructNode = this.lastNode = this.currentConstructNode = new Construct$1();

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
					if ((constructNode = currentNode)[BindingClause] === null) {
						symbol = BindingClause;
						break;
					} else if ((constructNode = currentNode) && constructNode[ExtendsClause] === null) {
						symbol = ExtendsClause;
						break;
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
								currentNode[ClassConstruct] !== undefined &&
								currentNode[ExtendsClause] === undefined
							) {
								type = token.text;
								currentNode[ExtendsClause] = null;
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
					case BindingClause:
						constructNode[BindingConstruct] = constructNode;
						break;
				}
			}

			return tokenNode;
		}

		throw(error) {
			throw error;
		}

		/**
		 * @param {{sourceRecord: ModuleSource, tokens: TokenizerTokens, log?:Collator['log'], collator?: Collator}} state
		 */
		static collate(state) {
			const collator = (state.collator = new Collator('ECMAScript'));
			const {
				sourceRecord,
				sourceRecord: {
					fragments = (sourceRecord.fragments = /** @type {ModuleSource['fragments']} */ ([])),
					// bindings = (sourceRecord.bindings = /** @type {ModuleSource['bindings']} */ ([])),
				},
				tokens,
				// collator = (state.collator = new Collator('ECMAScript')),
				log = (state.log = collator.log),
				// nonBindings = (state.nonBindings = []),
			} = state;

			if (collator.log != log) collator.log = log || undefined;

			for (const token of tokens) {
				if (!token || !token.text) continue;

				const node = collator.collate(token, tokens) || undefined;
				typeof node.text === 'string' && fragments.push(node.text);

				if (collator.queuedToken !== undefined) {
					const node = collator.collate(collator.queuedToken, tokens) || undefined;
					typeof node.text === 'string' && fragments.push(node.text);
				}
			}

			const {
				rootNode,
				rootNode: {constructs},
			} = collator;

			sourceRecord.rootNode = rootNode;
			sourceRecord.constructs = constructs;
			sourceRecord.compiledText = rootNode.text;

			return state;
		}
	};
})();

/** @typedef {import('../compiler/records').ModuleSource} ModuleSource */

export { Collator };
//# sourceMappingURL=collator.mjs.map
