const {
	bindProperty,
	copyProperty,
	create,
	entries,
	freeze,
	Reflect,
	ResolvedPromise,
	setProperty,
	setPrototypeOf,
} = (() => {
	const {
		Object: {create, entries, freeze, setPrototypeOf},
		Reflect: {set, apply, construct, defineProperty, getOwnPropertyDescriptor},
		Promise,
	} = globalThis;
	const noop = () => {};
	return {
		bindProperty: (target, property, get = noop, enumerable = false, configurable = false) =>
			defineProperty(target, property, {get, set: noop, configurable, enumerable}),
		copyProperty: (target, source, identifier, alias = identifier) =>
			defineProperty(target, alias, getOwnPropertyDescriptor(source, identifier)),
		create,
		entries: entries,
		freeze,
		noop,
		Reflect: freeze(setPrototypeOf({set, apply, construct, defineProperty, getOwnPropertyDescriptor}, null)),
		ResolvedPromise: Promise.resolve(),
		setProperty: (target, property, value, enumerable = false, configurable = false) =>
			defineProperty(target, property, {value, enumerable, configurable}) && value,
		setPrototypeOf,
	};
})();

const {GlobalScope, ModuleScope} = (() => {
	/** @type {import('./types').modules.GlobalScope} */
	const GlobalScope = globalThis;

	const globals = (({eval: $eval}) => ({eval: $eval}))(GlobalScope);

	const scope = freeze(setPrototypeOf({...globals}, GlobalScope));

	const locals = {};

	const {set, apply, construct} = Reflect;

	/** @type {import('./types').modules.ModuleScope} */
	const ModuleScope = new Proxy(scope, {
		get(target, property, receiver) {
			if (property in globals) return globals[property];
			const value = property in GlobalScope && typeof property === 'string' ? GlobalScope[property] : undefined;
			if (value && typeof value === 'function') {
				const local = locals[property];
				return (
					(local && local.value === value && local) ||
					((locals[property] = {
						value,
						construct(target, argArray, newTarget) {
							return newTarget === this.proxy ? construct(value, argArray) : construct(value, argArray, newTarget);
						},
						apply(method, thisArg, argArray) {
							return thisArg == null || thisArg === receiver ? value(...argArray) : apply(value, thisArg, argArray);
						},
					}),
					(locals[property].proxy = new Proxy(value, locals[property])),
					locals[property])
				).proxy;
			}
			return value;
		},
		set(target, property, value, receiver) {
			if (receiver !== ModuleScope) throw ReferenceError(`${property} is not defined [proxy says]`);
			return set(GlobalScope, property, value);
		},
	});

	return {GlobalScope, ModuleScope};
})();

class ModuleNamespaces {
	constructor(importHostModule) {
		setProperty(this, '[[importHostModule]]', importHostModule, true);
		setProperty(this, '[[imports]]', create(null), true);
		setProperty(
			this,
			'import',
			importHostModule
				? url =>
						this[url] ||
						(this['[[imports]]'][url] ||
							(this['[[imports]]'][url] = this['[[importHostModule]]'](url)).then(
								namespace => (bindProperty(this, url, () => namespace, true, false), namespace),
							))
				: this.import,
			true,
		);
	}

	/** @param {string} url @returns {Namespace | Promise<Namespace>} */
	import(url) {
		throw Error('Unsupported operation: [[importHostModule]] is undefined!');
	}
}

/** @typedef {import('./types').modules.Namespaces} Namespaces */
/** @typedef {import('./types').modules.Module.Namespace} Namespace */

/** ECMAScript quoted strings: `'…'` or `"…"`  */

/** Mapped binding: `Identifier as BindingIdentifier` */
const Mappings = /([^\s,]+)(?: +as +([^\s,]+))?/g;

/** Quoted export mappings: `export {…}` */
const Exports = /(\/\*\/|`)\s*export *{([^}`;\*\/\\()=+&|\-]*)}\s*(?:\1)/gm;

/** Nothing but Identifier Characters */
const Identifier = /[^\n\s\(\)\{\}\-=+*/%`"'~!&.:^<>,]+/;

const BindingDeclarations = /\b(import|export)\b +(?:{ *([^}]*?) *}|([*] +as +\S+|\S+)|)(?: +from\b|)(?: +(['"])(.*?)\4|)/g;

const Specifier = /^(?:([a-z]+[^/]*?:)\/{0,2}(\b[^/]+\/?)?)(\.{0,2}\/)?([^#?]*?)(\?[^#]*?)?(#.*?)?$/u;

Specifier.parse = specifier => {
	const [url, schema, domain, root, path, query, fragment] = Specifier.exec(specifier) || '';
	return {url, schema, domain, root, path, query, fragment, specifier};
};

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

//@ts-check

const environment = (globalThis => {
	const environment = {};

	/** @type {Set<string>} */
	const warnings = new Set();

	/** @type {Globals} */
	//@ts-ignore
	environment.globalThis = globalThis;

	const warning = message => {
		warnings.add(message);
	};

	if (environment.globalThis || warning('No valid globalThis object in scope')) {
		const {globalThis, warnings} = environment;

		const globalProperties = ['global', 'window', 'self'];

		for (const globalProperty of globalProperties)
			globalProperty in globalThis &&
				globalThis[globalProperty] != null &&
				typeof globalThis[globalProperty] === 'object' &&
				(globalThis[globalProperty] === globalThis[globalProperty][globalProperty]
					? (environment[globalProperty] = globalThis[globalProperty])
					: warning(`An invalid ${globalProperty} was found in scope`));

		if (
			globalProperties.findIndex(property => property in environment) > -1 ||
			warning(`No valid ${globalProperties.join(', ')} object(s) in scope`)
		) {
			const {global, window, self, process} = environment.globalThis;

			if (environment.global !== undefined) {
				/** @type {Environment['global']} */
				environment.global = global;

				process == null ||
					typeof process.pid !== 'number' ||
					/** @type {Environment['process']} */
					(environment.process = process);
			}
			if (environment.self !== undefined) {
				/** @type {Environment['self']} */
				environment.self = self;

				if (environment.window !== undefined) {
					/** @type {Environment['window']} */
					environment.window = window;
					const {document} = window;
					document != null && document.defaultView === window && (environment.document = document);
				} else if (
					typeof self.ServiceWorkerGlobalScope === 'function' &&
					self instanceof self.ServiceWorkerGlobalScope
				) {
					/** @type {Environment['serviceWorker']} */
					//@ts-ignore
					environment.serviceWorker = self;
				} else if (
					typeof self.DedicatedWorkerGlobalScope === 'function' &&
					self instanceof self.DedicatedWorkerGlobalScope
				) {
					/** @type {Environment['worker']} */
					//@ts-ignore
					environment.worker = self;
				}
			}
			environment.global !== undefined && (environment.global = global);
		}
	}

	// warning('Not a warning');

	warnings.size && console.warn(['Runtime Warnings:', ...warnings].join('\n\t'));

	/** @type {typeof environment & Environment} */
	return environment;
})(typeof globalThis === 'object' && globalThis !== null && globalThis === globalThis.globalThis && globalThis);

/** @typedef {import('./types').environment.Environment} Environment */
/** @typedef {import('./types').environment.Globals} Globals */

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
	class Construct$1 extends Parent {}

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
				case 'default':
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
						case '*':
							if (currentConstructText.endsWith('function')) {
								currentNode[Node.construct] += '*';
								break;
							}
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
	};
})();

//@ts-check

const {ModuleSource, ModuleBinding, DeclarationType} = (() => {
	const DeclarationType = {
		['function']: 'FunctionDeclaration',
		['async function']: 'AsyncFunctionDeclaration',
		['function*']: 'GeneratorFunctionDeclaration',
		['async function*']: 'AsyncGeneratorFunctionDeclaration',
		['class']: 'ClassDeclaration',
		['const']: 'VariableDeclaration',
		['let']: 'VariableDeclaration',
		['var']: 'VariableDeclaration',
		['import']: 'ImportDeclaration',
		['export']: 'ExportDeclaration',
		['export default']: 'ExportDefaultAssignmentExpression',
	};

	/** @param {Partial<ModuleBinding>} [record] */
	class ModuleBinding {
		constructor(record) {
			if (record) {
				({
					bindingIntent: this.bindingIntent,
					bindingDeclaration: this.bindingDeclaration,
					internalType: this.internalType,
					exportedType: this.exportedType,
					internalIdentifier: this.internalIdentifier,
					exportedIdentifier: this.exportedIdentifier,
					importedIdentifier: this.importedIdentifier,
					externalModuleSpecifier: this.externalModuleSpecifier,
				} = record);

				// Object.defineProperty(this, 'bindingDescription', {value: record.bindingDescription, enumerable: false});
			} else {
				/** @type {'import'|'export'|undefined} */
				this.bindingIntent = undefined;
				/** @type {DeclarationType|undefined} */
				this.bindingDeclaration = undefined;
				/** @type {'const'|'let'|'var'|'function'|'class'|'binding'|'void'|undefined} */
				this.internalType = undefined;
				/** @type {'constant'|'readonly'|'symbolic'|undefined} */
				this.exportedType = undefined;
				/** @type {string|undefined} */
				this.internalIdentifier = this.exportedIdentifier = this.importedIdentifier = undefined;
				/** @type {string|undefined} */
				this.externalModuleSpecifier = undefined;
			}
		}
	}

	ModuleBinding.DeclarationType = DeclarationType;

	class ModuleSource {
		/** @param {Partial<ModuleSource>} [record] */
		constructor(record) {
			if (record) {
				({
					compiledText: this.compiledText,
					compiledEvaluatorText: this.compiledEvaluatorText,
					sourceText: this.sourceText,
					sourceEvaluatorText: this.sourceEvaluatorText,
					sourceType: this.sourceType,
					rootNode: this.rootNode,
					fragments: this.fragments,
					bindings: this.bindings,
					constructs: this.constructs,
					errors: this.errors,
				} = record);
			} else {
				/** @type {string} */
				this.compiledText = undefined;
				/** @type {string} */
				this.compiledEvaluatorText = undefined;
				/** @type {string} */
				this.sourceText = undefined;
				/** @type {string} */
				this.sourceEvaluatorText = undefined;
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
				/** @type {Error[]} */
				this.errors = undefined;
			}
		}

		toString() {
			return this.compiledText;
		}

		/** @param {string} message @param {{lineNumber: number, columnNumber: number}} properties */
		error(message, properties, ErrorClass = Error) {
			const error = Object.assign(new ErrorClass(message), properties);
			this.errors === undefined ? (this.errors = [error]) : this.errors.push(error);
		}
	}

	if (environment.process) {
		const inspect = Symbol.for('nodejs.util.inspect.custom');
		ModuleSource.prototype[inspect] = ModuleBinding.prototype[inspect] = {
			/** @this {Node} @param {number} depth @param {NodeJS.InspectOptions & {stylize: Function}} options*/
			[inspect](depth, {stylize}) {
				return `${stylize(this.constructor.name, 'undefined')} ‹${stylize(
					`${this.sourceText.length} chars`,
					'number',
				)}›`;
			},
		}[inspect];
		// ModuleBinding.prototype[inspect] = {
		// 	/** @this {Node} @param {number} depth @param {NodeJS.InspectOptions & {stylize: Function}} options*/
		// 	[inspect](depth, {stylize}) {
		// 		return `${stylize(this.constructor.name, 'undefined')} ‹${stylize(this.sourceText, 'special')}›`;
		// 	},
		// }[inspect];
	}

	return {ModuleSource, ModuleBinding, DeclarationType};
})();

/** @typedef {ModuleSource} SourceRecord */
/** @typedef {ModuleBinding} BindingRecord */
/** @typedef {keyof (typeof DeclarationType)} DeclarationType */

//@ts-check
/// <reference path="./types.d.ts" />

// const trace = /** @type {[function, any[]][]} */ [];

class Matcher extends RegExp {
  /**
   * @template T
   * @param {Matcher.Pattern} pattern
   * @param {Matcher.Flags} [flags]
   * @param {Matcher.Entities} [entities]
   * @param {T} [state]
   */
  constructor(pattern, flags, entities, state) {
    // trace.push([new.target, [...arguments]]);
    //@ts-ignore
    super(pattern, flags);
    // Object.assign(this, RegExp.prototype, new.target.prototype);
    (pattern &&
      pattern.entities &&
      Symbol.iterator in pattern.entities &&
      ((!entities && (entities = pattern.entities)) || entities === pattern.entities)) ||
      Object.freeze((entities = (entities && Symbol.iterator in entities && [...entities]) || []));
    /** @type {MatcherEntities} */
    this.entities = entities;
    /** @type {T} */
    this.state = state;
    this.capture = this.capture;
    this.exec = this.exec;
    // this.test = this.test;
    ({
      // LOOKAHEAD: this.LOOKAHEAD = Matcher.LOOKAHEAD,
      // INSET: this.INSET = Matcher.INSET,
      // OUTSET: this.OUTSET = Matcher.OUTSET,
      DELIMITER: this.DELIMITER = Matcher.DELIMITER,
      UNKNOWN: this.UNKNOWN = Matcher.UNKNOWN,
    } = new.target);
  }

  /**
   * @param {string} source
   * @returns {MatcherMatchResult}
   */
  exec(source) {
    /** @type {MatcherMatchArray} */
    const match = super.exec(source);

    // @ts-ignore
    if (match === null) return null;

    match.matcher = this;
    match.capture = {};

    //@ts-ignore
    for (
      let i = 0, entity;
      match[++i] === undefined ||
      void (
        (entity = this.entities[(match.entity = i - 1)]) == null ||
        (typeof entity === 'function'
          ? entity(match[0], i, match, this.state)
          : (match.capture[(match.identity = entity)] = match[0]))
      );

    );
    // @ts-ignore
    return match;
  }

  /**
   * @param {Matcher.PatternFactory} factory
   * @param {Matcher.Flags} [flags]
   * @param {PropertyDescriptorMap} [properties]
   */
  static define(factory, flags, properties) {
    /** @type {MatcherEntities} */
    const entities = [];
    entities.flags = '';
    // const pattern = factory(entity => void entities.push(((entity != null || undefined) && entity) || undefined));
    const pattern = factory(entity => {
      if (entity !== null && entity instanceof Matcher) {
        entities.push(...entity.entities);

        !entity.flags || (entities.flags = entities.flags ? Matcher.flags(entities.flags, entity.flags) : entity.flags);

        return entity.source;
      } else {
        entities.push(((entity != null || undefined) && entity) || undefined);
      }
    });
    flags = Matcher.flags('g', flags == null ? pattern.flags : flags, entities.flags);
    const matcher = new ((this && (this.prototype === Matcher.prototype || this.prototype instanceof RegExp) && this) ||
      Matcher)(pattern, flags, entities);

    properties && Object.defineProperties(matcher, properties);

    return matcher;
  }

  static flags(...sources) {
    let flags = '',
      iterative;
    for (const source of sources) {
      if (!source || (typeof source !== 'string' && typeof source.flags !== 'string')) continue;
      for (const flag of source.flags || source)
        (flag === 'g' || flag === 'y' ? iterative || !(iterative = true) : flags.includes(flag)) || (flags += flag);
    }
    // console.log('%o: ', flags, ...sources);
    return flags;
  }

  static get sequence() {
    const {raw} = String;
    const {replace} = Symbol;
    /**
     * @param {TemplateStringsArray} template
     * @param  {...any} spans
     * @returns {string}
     */
    const sequence = (template, ...spans) =>
      sequence.WHITESPACE[replace](raw(template, ...spans.map(sequence.span)), '');
    /**
     * @param {any} value
     * @returns {string}
     */
    sequence.span = value =>
      (value &&
        // TODO: Don't coerce to string here?
        (typeof value !== 'symbol' && `${value}`)) ||
      '';

    sequence.WHITESPACE = /^\s+|\s*\n\s*|\s+$/g;

    Object.defineProperty(Matcher, 'sequence', {value: Object.freeze(sequence), enumerable: true, writable: false});
    return sequence;
  }

  static get join() {
    const {sequence} = this;

    const join = (...values) =>
      values
        .map(sequence.span)
        .filter(Boolean)
        .join('|');

    Object.defineProperty(Matcher, 'join', {value: Object.freeze(join), enumerable: true, writable: false});

    return join;
  }
}

const {
  // INSET = (Matcher.INSET = /* Symbol.for */ 'INSET'),
  // OUTSET = (Matcher.OUTSET = /* Symbol.for */ 'OUTSET'),
  DELIMITER = (Matcher.DELIMITER = /* Symbol.for */ 'DELIMITER'),
  UNKNOWN = (Matcher.UNKNOWN = /* Symbol.for */ 'UNKNOWN'),
  // LOOKAHEAD = (Matcher.LOOKAHEAD = /* Symbol.for */ 'LOOKAHEAD'),
  escape = (Matcher.escape = /** @type {<T>(source: T) => string} */ ((() => {
    const {replace} = Symbol;
    return source => /[\\^$*+?.()|[\]{}]/g[replace](source, '\\$&');
  })())),
  sequence,
  matchAll = (Matcher.matchAll =
    /**
     * @template {RegExp} T
     * @type {(string: Matcher.Text, matcher: T) => Matcher.Iterator<T> }
     */
    //@ts-ignore
    (() =>
      Function.call.bind(
        // String.prototype.matchAll || // TODO: Uncomment eventually
        {
          /**
           * @this {string}
           * @param {RegExp | string} pattern
           */
          *matchAll() {
            const matcher =
              arguments[0] &&
              (arguments[0] instanceof RegExp
                ? Object.setPrototypeOf(RegExp(arguments[0].source, arguments[0].flags || 'g'), arguments[0])
                : RegExp(arguments[0], 'g'));
            const string = String(this);

            if (!(matcher.flags.includes('g') || matcher.flags.includes('y'))) return void (yield matcher.exec(string));

            for (
              let match, lastIndex = -1;
              lastIndex <
              ((match = matcher.exec(string)) ? (lastIndex = matcher.lastIndex + (match[0].length === 0)) : lastIndex);
              yield match, matcher.lastIndex = lastIndex
            );
          },
        }.matchAll,
      ))()),
} = Matcher;

const {
  ranges,
  BinaryDigit,
  DecimalDigit,
  ControlLetter,
  HexLetter,
  HexDigit,
  GraveAccent,
  Null,
  ZeroWidthNonJoiner,
  ZeroWidthJoiner,
  ZeroWidthNoBreakSpace,
  Whitespace,
  ID_Start,
  ID_Continue,
  UnicodeIDStart,
  UnicodeIDContinue,
} = (factories => {
  const {String, RegExp, Symbol, Object} = globalThis;
  const {raw} = String;
  const {replace: ReplaceSymbol} = Symbol;
  const {defineProperty, create} = Object;

  const RegExpClass = /^(?:\[(?=.*?\]$)|)((?:\\.|[^\\\n\[\]]*)*)\]?$/;

  class RegExpRange extends RegExp {
    constructor(source, flags) {
      let range;
      range =
        source && typeof source === 'object' && source instanceof RegExp
          ? (flags === undefined && (flags = source.flags), source.source)
          : (typeof source === 'string' ? source : (source = `${source || ''}`)).trim() &&
            (source = RegExpClass[ReplaceSymbol](source, '[$1]'));

      if (!range || !RegExpClass.test(range)) {
        throw TypeError(`Invalid Regular Expression class range: ${range}`);
      }

      typeof flags === 'string' || (flags = `${flags || ''}` || '');

      flags.includes('u') || !(source.includes('\\p{') || source.includes('\\u')) || (flags += 'u');
      super(source, flags);
      defineProperty(this, 'range', {value: range.slice(1, -1), enumerable: true, writable: false});
    }

    toString() {
      return this.range;
    }

    static range(strings, ...values) {
      return new (this || RegExpRange)(raw(strings, ...values));
    }
  }

  const safeRange = (strings, ...values) => {
    try {
      return RegExpRange.range(strings, ...values).source.slice(1, -1);
    } catch (exception) {}
  };

  const descriptors = {
    ranges: {
      get() {
        return ranges;
      },
      enumerable: true,
      configurable: false,
    },
  };

  for (const property in factories) {
    descriptors[property] = {
      get() {
        const value = factories[property](safeRange, ranges);
        defineProperty(ranges, property, {value, enumerable: true, configurable: false});
        return value;
      },
      enumerable: true,
      configurable: true,
    };
  }

  /** @type {Record<keyof factories, string>} */
  const ranges = create(null, descriptors);

  return ranges;
})({
  UnicodeIDStart: (range, {ID_Start}) => range`_$${ID_Start}`,
  UnicodeIDContinue: (range, {ID_Continue, ZeroWidthNonJoiner, ZeroWidthJoiner, CombiningGraphemeJoiner}) =>
    range`$${ID_Continue}${ZeroWidthNonJoiner}${ZeroWidthJoiner}${CombiningGraphemeJoiner}`,
  Null: range => range`\0`,
  BinaryDigit: range => range`01`,
  DecimalDigit: range => range`0-9`,
  ControlLetter: range => range`a-zA-Z`,
  HexLetter: range => range`a-fA-F`,
  HexDigit: (range, {DecimalDigit, HexLetter}) => range`${DecimalDigit}${HexLetter}`,
  GraveAccent: range => range`${'`'}`,
  ZeroWidthNonJoiner: range => range`\u200c`,
  ZeroWidthJoiner: range => range`\u200d`,
  ZeroWidthNoBreakSpace: range => range`\ufeff`,
  CombiningGraphemeJoiner: range => range`\u034f`,
  Whitespace: (range, {ZeroWidthNoBreakSpace}) => range`\s${ZeroWidthNoBreakSpace}`,
  ID_Start: range =>
    range`\p{ID_Start}` ||
    range`A-Za-z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376-\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e-\u066f\u0671-\u06d3\u06d5\u06e5-\u06e6\u06ee-\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4-\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f-\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc-\u09dd\u09df-\u09e1\u09f0-\u09f1\u09fc\u0a05-\u0a0a\u0a0f-\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32-\u0a33\u0a35-\u0a36\u0a38-\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2-\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0-\u0ae1\u0af9\u0b05-\u0b0c\u0b0f-\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32-\u0b33\u0b35-\u0b39\u0b3d\u0b5c-\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99-\u0b9a\u0b9c\u0b9e-\u0b9f\u0ba3-\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60-\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0-\u0ce1\u0cf1-\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32-\u0e33\u0e40-\u0e46\u0e81-\u0e82\u0e84\u0e86-\u0e8a\u0e8c-\u0ea3\u0ea5\u0ea7-\u0eb0\u0eb2-\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065-\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae-\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf3\u1cf5-\u1cf6\u1cfa\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a-\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7bf\ua7c2-\ua7c6\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd-\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5-\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab67\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc`,
  ID_Continue: range =>
    range`\p{ID_Continue}` ||
    range`0-9A-Z_a-z\xaa\xb5\xb7\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376-\u0377\u037a-\u037d\u037f\u0386-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u0487\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u0591-\u05bd\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05c7\u05d0-\u05ea\u05ef-\u05f2\u0610-\u061a\u0620-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u07fd\u0800-\u082d\u0840-\u085b\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u08d3-\u08e1\u08e3-\u0963\u0966-\u096f\u0971-\u0983\u0985-\u098c\u098f-\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7-\u09c8\u09cb-\u09ce\u09d7\u09dc-\u09dd\u09df-\u09e3\u09e6-\u09f1\u09fc\u09fe\u0a01-\u0a03\u0a05-\u0a0a\u0a0f-\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32-\u0a33\u0a35-\u0a36\u0a38-\u0a39\u0a3c\u0a3e-\u0a42\u0a47-\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2-\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0af9-\u0aff\u0b01-\u0b03\u0b05-\u0b0c\u0b0f-\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32-\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47-\u0b48\u0b4b-\u0b4d\u0b56-\u0b57\u0b5c-\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71\u0b82-\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99-\u0b9a\u0b9c\u0b9e-\u0b9f\u0ba3-\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bef\u0c00-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55-\u0c56\u0c58-\u0c5a\u0c60-\u0c63\u0c66-\u0c6f\u0c80-\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5-\u0cd6\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0cf1-\u0cf2\u0d00-\u0d03\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d44\u0d46-\u0d48\u0d4a-\u0d4e\u0d54-\u0d57\u0d5f-\u0d63\u0d66-\u0d6f\u0d7a-\u0d7f\u0d82-\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2-\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81-\u0e82\u0e84\u0e86-\u0e8a\u0e8c-\u0ea3\u0ea5\u0ea7-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ecd\u0ed0-\u0ed9\u0edc-\u0edf\u0f00\u0f18-\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u109d\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135d-\u135f\u1369-\u1371\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772-\u1773\u1780-\u17d3\u17d7\u17dc-\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1820-\u1878\u1880-\u18aa\u18b0-\u18f5\u1900-\u191e\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u19d0-\u19da\u1a00-\u1a1b\u1a20-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1aa7\u1ab0-\u1abd\u1b00-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1bf3\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1cd0-\u1cd2\u1cd4-\u1cfa\u1d00-\u1df9\u1dfb-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u203f-\u2040\u2054\u2071\u207f\u2090-\u209c\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d7f-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua62b\ua640-\ua66f\ua674-\ua67d\ua67f-\ua6f1\ua717-\ua71f\ua722-\ua788\ua78b-\ua7bf\ua7c2-\ua7c6\ua7f7-\ua827\ua840-\ua873\ua880-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f7\ua8fb\ua8fd-\ua92d\ua930-\ua953\ua960-\ua97c\ua980-\ua9c0\ua9cf-\ua9d9\ua9e0-\ua9fe\uaa00-\uaa36\uaa40-\uaa4d\uaa50-\uaa59\uaa60-\uaa76\uaa7a-\uaac2\uaadb-\uaadd\uaae0-\uaaef\uaaf2-\uaaf6\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab67\uab70-\uabea\uabec-\uabed\uabf0-\uabf9\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe00-\ufe0f\ufe20-\ufe2f\ufe33-\ufe34\ufe4d-\ufe4f\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff3f\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc`,
});

const EmptyTokenArray = (EmptyTokenArray =>
  Object.freeze(
    new (Object.freeze(Object.freeze(Object.setPrototypeOf(EmptyTokenArray.prototype, null)).constructor, null))(),
  ))(
  class EmptyTokenArray {
    *[Symbol.iterator]() {}
  },
);

/** @type {(string: string, sequence: string , index?: number) => number} */
const indexOf = Function.call.bind(String.prototype.indexOf);
/** @type {(string: string) => number} */
const countLineBreaks = text => {
  let lineBreaks = 0;
  for (let index = -1; (index = indexOf(text, '\n', index + 1)) > -1; lineBreaks++);
  return lineBreaks;
};

/**
 * @typedef { Partial<{syntax: string, matcher: RegExp, [name:string]: Set | Map | {[name:string]: Set | Map | RegExp} }> } Mode
 * @typedef { {[name: string]: Mode} } Modes
 * @typedef { {[name: string]: {syntax: string} } } Mappings
 * @typedef { {aliases?: string[], syntax: string} } ModeOptions
 * @typedef { (options: ModeOptions, modes: Modes) => Mode } ModeFactory
 */

//@ts-check

/** @typedef {typeof stats} ContextStats */
const stats = {
  captureCount: 0,
  contextCount: 0,
  tokenCount: 0,
  nestedCaptureCount: 0,
  nestedContextCount: 0,
  nestedTokenCount: 0,
};

/** @param {State} state */
// TODO: Document initializeState
const initializeState = state => {
  /** @type {Groups} state */
  (state.groups = []).closers = [];
  state.lineOffset = state.lineIndex = 0;
  state.totalCaptureCount = state.totalTokenCount = 0;

  /** @type {Contexts} */
  const contexts = (state.contexts = Array(100));
  const context = initializeContext({
    id: `«${state.matcher.goal.name}»`,
    //@ts-ignore
    number: (contexts.count = state.totalContextCount = 1),
    depth: 0,
    parentContext: undefined,
    goal: state.matcher.goal,
    group: undefined,
    state,
  });
  state.lastTokenContext = void (state.firstTokenContext = state.nextTokenContext = contexts[
    -1
  ] = state.context = state.lastContext = context);
};

/** @param {State} state */
// TODO: Document initializeState
const finalizeState = state => {
  const isValidState =
    state.firstTokenContext === state.nextTokenContext &&
    state.nextToken === undefined &&
    state.nextOffset === undefined;

  const {
    flags: {debug = false} = {},
    options: {console: {log = console.log, warn = console.warn} = console} = {},
    error = (state.error = !isValidState ? 'Unexpected end of tokenizer state' : undefined),
  } = state;

  // if (!debug && error) throw Error(error);

  // Finalize latent token artifacts
  state.nextTokenContext = void (state.lastTokenContext = state.nextTokenContext);

  // Finalize tokenization artifacts
  // NOTE: don't forget to uncomment after debugging
  state.context = state.contexts = state.groups = undefined;

  // Output to console when necessary
  debug && (error ? warn : log)(`[tokenizer]: ${error || 'done'} — %O`, state);
};

/** @param {Match} match @param {State} state */
const createToken = (match, state) => {
  let currentGoal,
    // goalName,
    currentGoalType,
    contextId,
    contextNumber,
    contextDepth,
    contextGroup,
    parentContext,
    tokenReference,
    tokenContext,
    nextToken,
    text,
    type,
    fault,
    punctuator,
    offset,
    lineInset,
    lineBreaks,
    isDelimiter,
    isComment,
    isWhitespace,
    flatten,
    fold,
    columnNumber,
    lineNumber,
    tokenNumber,
    captureNumber,
    hint;

  const {
    context: currentContext,
    nextContext,
    lineIndex,
    lineOffset,
    nextOffset,
    lastToken,
    lastTrivia,
    lastAtom,
  } = state;

  /* Capture */
  ({
    0: text,
    capture: {inset: lineInset},
    identity: type,
    flatten,
    fault,
    punctuator,
    index: offset,
  } = match);

  if (!text) return;

  ({
    id: contextId,
    number: contextNumber,
    depth: contextDepth,
    goal: currentGoal,
    group: contextGroup,
    parentContext,
  } = tokenContext = (type === 'opener' && nextContext) || currentContext);

  currentGoalType = currentGoal.type;

  nextOffset &&
    (state.nextOffset = void (nextOffset > offset && (text = match.input.slice(offset, nextOffset)),
    (state.matcher.lastIndex = nextOffset)));

  lineBreaks = (text === '\n' && 1) || countLineBreaks(text);
  isDelimiter = type === 'closer' || type === 'opener';
  isWhitespace = !isDelimiter && (type === 'whitespace' || type === 'break' || type === 'inset');

  (isComment = type === 'comment' || punctuator === 'comment')
    ? (type = 'comment')
    : type || (type = (!isDelimiter && !fault && currentGoalType) || 'text');

  if (lineBreaks) {
    state.lineIndex += lineBreaks;
    state.lineOffset = offset + (text === '\n' ? 1 : text.lastIndexOf('\n'));
  }

  /* Flattening / Token Folding */

  flatten === false || flatten === true || (flatten = !isDelimiter && currentGoal.flatten === true);

  captureNumber = ++tokenContext.captureCount;
  state.totalCaptureCount++;

  if (
    (fold = flatten) && // fold only if flatten is allowed
    lastToken != null &&
    ((lastToken.contextNumber === contextNumber && lastToken.fold === true) ||
      (type === 'closer' && flatten === true)) && // never fold across contexts
    (lastToken.type === type || (currentGoal.fold === true && (lastToken.type = currentGoalType)))
  ) {
    lastToken.captureCount++;
    lastToken.text += text;
    lineBreaks && (lastToken.lineBreaks += lineBreaks);
  } else {
    // The generator retains this new as state.nextToken
    //   which means tokenContext is state.nextTokenContext
    //   and the fact that we are returning a token here will
    //   yield the current state.nextToken so we need to also
    //   set state.lastTokenContext to match
    //
    //   TODO: Add parity tests for tokenizer's token/context states
    state.lastTokenContext = state.nextTokenContext;
    state.nextTokenContext = tokenContext;

    /* Token Creation */
    flatten = false;
    columnNumber = 1 + (offset - lineOffset || 0);
    lineNumber = 1 + (lineIndex || 0);

    tokenNumber = ++tokenContext.tokenCount;
    state.totalTokenCount++;

    // hint = `${(isDelimiter ? type : currentGoalType && `in-${currentGoalType}`) ||
    hint = `${
      currentGoalType
        ? isDelimiter && currentGoal.opener === text
          ? `${type}`
          : `in-${currentGoalType}`
        : isDelimiter
        ? type
        : ''
    }\n\n${contextId} #${tokenNumber}\n(${lineNumber}:${columnNumber})`;

    tokenReference = isWhitespace || isComment ? 'lastTrivia' : 'lastAtom';

    nextToken = tokenContext[tokenReference] = state[tokenReference] = tokenContext.lastToken = state.lastToken = {
      text,
      type,
      offset,
      punctuator,
      hint,
      lineOffset,
      lineBreaks,
      lineInset,
      columnNumber,
      lineNumber,
      captureNumber,
      captureCount: 1,
      tokenNumber,
      contextNumber,
      contextDepth,

      isWhitespace, // whitespace:
      isDelimiter, // delimiter:
      isComment, // comment:

      // FIXME: Nondescript
      fault,
      fold,
      flatten,

      goal: currentGoal,
      group: contextGroup,
      state,
      context: tokenContext,
    };
  }
  /* Context */
  !nextContext ||
    ((state.nextContext = undefined), nextContext === currentContext) ||
    ((state.lastContext = currentContext),
    currentContext === nextContext.parentContext
      ? (state.totalContextCount++,
        (nextContext.precedingAtom = lastAtom),
        (nextContext.precedingTrivia = lastTrivia),
        (nextContext.precedingToken = lastToken))
      : ((parentContext.nestedContextCount += currentContext.nestedContextCount + currentContext.contextCount),
        (parentContext.nestedCaptureCount += currentContext.nestedCaptureCount + currentContext.captureCount),
        (parentContext.nestedTokenCount += currentContext.nestedTokenCount + currentContext.tokenCount)),
    (state.context = nextContext));

  return nextToken;
};

/**
 * @template {{}} T
 * @param {Partial<Context>} context
 * @param {T} [properties]
 * @returns {Context & T}
 */
//@ts-ignore
const initializeContext = (context, properties) => {
  Object.assign(context, stats, properties);
  //@ts-ignore
  context.goal && context.goal.initializeContext && context.goal.initializeContext(context);
  //@ts-ignore
  return context;
};

const capture = (identity, match, text) => {
  match.capture[(match.identity = identity)] = text || match[0];
  (match.fault = identity === 'fault') && (match.flatten = false);
  return match;
};

/**
 * Safely mutates matcher state to open a new context.
 *
 * @template {{}} T
 * @param {string} text - Text of the intended { type = "opener" } token
 * @param {State} state - Matcher state
 * @param {T} [properties]
 * @returns {undefined | string} - String when context is **not** open
 */
const open = (text, state, properties) => {
  // const {goal: initialGoal, groups} = state;
  const {
    contexts,
    context: parentContext,
    context: {depth: index, goal: initialGoal},
    groups,
  } = state;
  const group = initialGoal.groups[text];

  if (!group) return initialGoal.type || 'sequence';
  groups.splice(index, groups.length, group);
  groups.closers.splice(index, groups.closers.length, group.closer);

  parentContext.contextCount++;

  const goal = group.goal === undefined ? initialGoal : group.goal;

  state.nextContext = contexts[index] = initializeContext({
    id: `${parentContext.id} ${
      goal !== initialGoal ? `\n${goal[Symbol.toStringTag]} ${group[Symbol.toStringTag]}` : group[Symbol.toStringTag]
    }`,
    number: ++contexts.count,
    depth: index + 1,
    parentContext,
    goal,
    group,
    state,
  });
};

/**
 * Safely mutates matcher state to close the current context.
 *
 * @param {string} text - Text of the intended { type = "closer" } token
 * @param {State} state - Matcher state
 * @returns {undefined | string} - String when context is **not** closed
 */
const close = (text, state) => {
  const groups = state.groups;
  const index = groups.closers.lastIndexOf(text);

  if (index === -1 || index !== groups.length - 1) return fault(text, state);

  groups.closers.splice(index, groups.closers.length);
  groups.splice(index, groups.length);
  state.nextContext = state.context.parentContext;
};

/**
 * Safely mutates matcher state to skip ahead.
 *
 * TODO: Finish implementing forward helper
 *
 * @param {string | RegExp} search
 * @param {Match} match
 * @param {State} state
 */
const forward = (search, match, state) => {
  search &&
    (typeof search === 'object'
      ? ((search.lastIndex = match.index + match[0].length), (state.nextOffset = match.input.search(search)))
      : (state.nextOffset = match.input.indexOf(search, match.index + match[0].length)) > match.index ||
        (() => {
          throw new Error('Parse Error: Unexpected end of stream');
        })());
  // state.nextOffset = match.input.length - 1
};

/**
 * @returns {'fault'}
 */
const fault = (text, state) => {
  console.warn(text, {...state});
  return 'fault';
};

/** @param {string[]} keys */
const Symbols = (...keys) => {
  const symbols = {};
  for (const key of keys) symbols[key] = Symbol(key);
  return symbols;
};

const generateDefinitions = ({groups, goals, identities, symbols, keywords, tokens}) => {
  const {[symbols.FaultGoal]: FaultGoal} = goals;

  const {create, freeze, entries, getOwnPropertySymbols, getOwnPropertyNames, setPrototypeOf} = Object;

  const punctuators = create(null);

  for (const opener of getOwnPropertyNames(groups)) {
    const {[opener]: group} = groups;
    'goal' in group && (group.goal = goals[group.goal] || FaultGoal);
    'parentGoal' in group && (group.parentGoal = goals[group.parentGoal] || FaultGoal);
    freeze(group);
  }

  for (const symbol of getOwnPropertySymbols(goals)) {
    // @ts-ignore
    const {[symbol]: goal} = goals;

    goal.name = (goal.symbol = symbol).description.replace(/Goal$/, '');
    goal[Symbol.toStringTag] = `«${goal.name}»`;
    goal.tokens = tokens[symbol] = {};
    goal.groups = [];

    if (goal.punctuators) {
      for (const punctuator of (goal.punctuators = [...goal.punctuators]))
        punctuators[punctuator] = !(goal.punctuators[punctuator] = true);
      freeze(setPrototypeOf(goal.punctuators, punctuators));
    }

    if (goal.closers) {
      for (const closer of (goal.closers = [...goal.closers])) punctuators[closer] = !(goal.closers[closer] = true);
      freeze(setPrototypeOf(goal.closers, punctuators));
    }

    if (goal.openers) {
      for (const opener of (goal.openers = [...goal.openers])) {
        const group = (goal.groups[opener] = {...groups[opener]});
        punctuators[opener] = !(goal.openers[opener] = true);
        GoalSpecificTokenRecord(goal, group.opener, 'opener', {group});
        GoalSpecificTokenRecord(goal, group.closer, 'closer', {group});
        group[Symbol.toStringTag] = `‹${group.opener}›`;
      }
      freeze(setPrototypeOf(goal.openers, punctuators));
    }

    freeze(goal.groups);
    freeze(goal.tokens);
    freeze(goal);
  }

  freeze(punctuators);
  freeze(goals);
  freeze(groups);
  freeze(identities);
  freeze(symbols);

  for (const [identity, list] of entries({})) {
    for (const keyword of list.split(/\s+/)) keywords[keyword] = identity;
  }
  keywords[Symbol.iterator] = Array.prototype[Symbol.iterator].bind(Object.getOwnPropertyNames(keywords));
  freeze(keywords);

  /**
   * Creates a symbolically mapped goal-specific token record
   *
   * @template {{}} T
   * @param {Goal} goal
   * @param {string} text
   * @param {type} type
   * @param {T} properties
   */
  function GoalSpecificTokenRecord(goal, text, type, properties) {
    const symbol = Symbol(`‹${goal.name} ${text}›`);
    return (goal.tokens[text] = goal.tokens[symbol] = tokens[symbol] = {symbol, text, type, goal, ...properties});
  }
};

/**
 * @template {string} K
 * @template {string} I
 * @param {{[i in I]: K[]}} mappings
 */
const Keywords = mappings => {
  /** @type {{[k in K]: I}} */
  //@ts-ignore
  const keywords = {};

  for (const identity in mappings) {
    for (const keyword of mappings[identity]) {
      keywords[keyword] = identity;
    }
  }
  return keywords;
};

/** @typedef {import('./types').Match} Match */
/** @typedef {import('./types').Groups} Groups */
/** @typedef {import('./types').Group} Group */
/** @typedef {import('./types').Goal} Goal */
/** @typedef {import('./types').Context} Context */
/** @typedef {import('./types').Contexts} Contexts */
/** @typedef {import('./types').State} State */

// /** @typedef {typeof goals} goals */
// /** @typedef {goals[keyof goals]} Goal */
/** @typedef {Goal['type']} type */
/** @typedef {{symbol: symbol, text: string, type: type, goal?: Goal, group?: Group}} token */
// /** @typedef {typeof groups} groups */
// /** @typedef {groups[keyof groups]} Group */

//@ts-check

const symbols = Symbols(
  'ECMAScriptGoal',
  'CommentGoal',
  'RegExpGoal',
  'StringGoal',
  'TemplateLiteralGoal',
  'FaultGoal',
);

/** Unique token records @type {{[symbol: symbol]: }} */
const tokens = {};

const identities = {
  UnicodeIDStart: 'ECMAScriptUnicodeIDStart',
  UnicodeIDContinue: 'ECMAScriptUnicodeIDContinue',
  HexDigits: 'ECMAScriptHexDigits',
  CodePoint: 'ECMAScriptCodePoint',
  ControlEscape: 'ECMAScriptControlEscape',
  ContextualWord: 'ECMAScriptContextualWord',
  RestrictedWord: 'ECMAScriptRestrictedWord',
  FutureReservedWord: 'ECMAScriptFutureReservedWord',
  Keyword: 'ECMAScriptKeyword',
  // MetaProperty: 'ECMAScriptMetaProperty',
};

const goals = {
  [symbols.ECMAScriptGoal]: {
    type: undefined,
    flatten: undefined,
    fold: undefined,
    openers: ['{', '(', '[', "'", '"', '`', '/', '/*', '//'],
    closers: ['}', ')', ']'],
  },
  [symbols.CommentGoal]: {type: 'comment', flatten: true, fold: true},
  [symbols.RegExpGoal]: {
    type: 'pattern',
    flatten: undefined,
    fold: undefined,
    openers: ['[', '(', '{'],
    closers: [']', ')', '}'],
    opener: '/',
    closer: '/',
    // punctuators: ['+', '*', '?', '|', '^', '{', '}', '(', ')'],
    punctuators: ['+', '*', '?', '|', '^'],
  },
  [symbols.StringGoal]: {type: 'quote', flatten: true, fold: true},
  [symbols.TemplateLiteralGoal]: {
    type: 'quote',
    flatten: true,
    fold: false,
    openers: ['${'],
    opener: '`',
    closer: '`',
  },
  [symbols.FaultGoal]: {type: 'fault'}, // , groups: {}
};

const {
  [symbols.FaultGoal]: FaultGoal,
  [symbols.ECMAScriptGoal]: ECMAScriptGoal,
  [symbols.CommentGoal]: CommentGoal,
  [symbols.RegExpGoal]: RegExpGoal,
  [symbols.StringGoal]: StringGoal,
  [symbols.TemplateLiteralGoal]: TemplateLiteralGoal,
} = goals;

const groups = {
  ['{']: {opener: '{', closer: '}'},
  ['(']: {opener: '(', closer: ')'},
  ['[']: {opener: '[', closer: ']'},
  ['//']: {opener: '//', closer: '\n', goal: symbols.CommentGoal, parentGoal: symbols.ECMAScriptGoal},
  ['/*']: {opener: '/*', closer: '*/', goal: symbols.CommentGoal, parentGoal: symbols.ECMAScriptGoal},
  ['/']: {opener: '/', closer: '/', goal: symbols.RegExpGoal, parentGoal: symbols.ECMAScriptGoal},
  ["'"]: {opener: "'", closer: "'", goal: symbols.StringGoal, parentGoal: symbols.ECMAScriptGoal},
  ['"']: {opener: '"', closer: '"', goal: symbols.StringGoal, parentGoal: symbols.ECMAScriptGoal},
  ['`']: {
    opener: '`',
    closer: '`',
    goal: symbols.TemplateLiteralGoal,
    parentGoal: symbols.ECMAScriptGoal,
  },
  ['${']: {
    opener: '${',
    closer: '}',
    goal: symbols.ECMAScriptGoal,
    parentGoal: symbols.TemplateLiteralGoal,
  },
};

/** @type {ECMAScript.Keywords} */
// @ts-ignore
const keywords = Keywords({
  // TODO: Let's make those constructs (this.new.target borks)
  // [identities.MetaProperty]: 'new.target import.meta',
  [identities.Keyword]: [
    ...['await', 'break', 'case', 'catch', 'class', 'const', 'continue'],
    ...['debugger', 'default', 'delete', 'do', 'else', 'export', 'extends'],
    ...['finally', 'for', 'function', 'if', 'import', 'in', 'instanceof'],
    ...['let', 'new', 'return', 'super', 'switch', 'this', 'throw', 'try'],
    ...['typeof', 'var', 'void', 'while', 'with', 'yield'],
  ],
  [identities.RestrictedWord]: ['interface', 'implements', 'package', 'private', 'protected', 'public'],
  [identities.FutureReservedWord]: ['enum'],
  // NOTE: This is purposely not aligned with the spec
  [identities.ContextualWord]: ['arguments', 'async', 'as', 'from', 'of', 'static', 'get', 'set'],
});

{
  const operativeKeywords = new Set('await delete typeof void yield'.split(' '));
  const declarativeKeywords = new Set('export import default async function class const let var'.split(' '));
  const constructiveKeywords = new Set('await async function class await delete typeof void yield this new'.split(' '));

  /**
   * Determines if the capture is a valid keyword, identifier or undefined
   * based on matcher state (ie lastAtom, context, intent) and subset
   * of ECMAScript keyword rules of significant.
   *
   * TODO: Refactor or extensively test captureKeyword
   * TODO: Document subset of ECMAScript keyword rules of significant
   *
   * @param {string} text - Matched by /\b(‹text›)\b(?=[^\s$_:]|\s+[^:]|$)
   * @param {State} state
   * @param {string} [intent]
   */
  const captureKeyword = (text, {lastAtom: pre, lineIndex, context}, intent) => {
    //                              (a) WILL BE ‹fault› UNLESS  …
    switch (intent || (intent = context.intent)) {
      //  DESTRUCTURING INTENT  (ie Variable/Class/Function declarations)
      case 'destructuring':
      //  DECLARATION INTENT  (ie Variable/Class/Function declarations)
      case 'declaration':
        return (
          //                        (b)   WILL BE ‹idenfitier›
          //                              AFTER ‹.›  (as ‹operator›)
          (pre !== undefined && pre.text === '.' && 'identifier') ||
          //                        (c)   WILL BE ‹keyword›
          //                              IF DECLARATIVE AND …
          (declarativeKeywords.has(text) &&
            //                      (c1)  NOT AFTER ‹keyword› …
            (pre === undefined ||
              pre.type !== 'keyword' ||
              //                          UNLESS IS DIFFERENT
              (pre.text !== text &&
                //                        AND NOT ‹export› NOR ‹import›
                !(text === 'export' || text === 'import') &&
                //                  (c2)  FOLLOWS ‹export› OR ‹default›
                (pre.text === 'export' ||
                  pre.text === 'default' ||
                  //                (c3)  IS ‹function› AFTER ‹async›
                  (pre.text === 'async' && text === 'function')))) &&
            'keyword')
        );
      default:
        return (
          //                        (b)   WILL BE ‹idenfitier› …
          (((pre !== undefined &&
            //                      (b1)  AFTER ‹.›  (as ‹operator›)
            pre.text === '.') ||
            //                      (b2)  OR ‹await› (not as ‹keyword›)
            (text === 'await' && context.awaits === false) ||
            //                      (b3)  OR ‹yield› (not as ‹keyword›)
            (text === 'yield' && context.yields === false)) &&
            'identifier') ||
          //                        (c)   WILL BE ‹keyword› …
          ((pre === undefined ||
            //                      (c1)  NOT AFTER ‹keyword›
            pre.type !== 'keyword' ||
            //                      (c2)  UNLESS OPERATIVE
            operativeKeywords.has(pre.text) ||
            //                      (c3)  OR ‹if› AFTER ‹else›
            (text === 'if' && pre.text === 'else') ||
            //                      (c4)  OR ‹default› AFTER ‹export›
            (text === 'default' && pre.text === 'export') ||
            //                      (c5)  NOT AFTER ‹async›
            //                            EXCEPT ‹function›
            ((pre.text !== 'async' || text === 'function') &&
              //                    (c6)  AND NOT AFTER ‹class›
              //                          EXCEPT ‹extends›
              (pre.text !== 'class' || text === 'extends') &&
              //                    (c7)  AND NOT AFTER ‹for›
              //                          EXCEPT ‹await› (as ‹keyword›)
              (pre.text !== 'for' || text === 'await') &&
              //                    (c6)  NOT AFTER ‹return›
              //                          AND IS DIFFERENT
              //                          AND IS NOT ‹return›
              (pre.text !== 'return'
                ? pre.text !== text
                : text !== 'return'
                ? //                (c7)  OR AFTER ‹return›
                  //                      AND IS CONSTRUCTIVE
                  constructiveKeywords.has(text)
                : //                (c8)  OR AFTER ‹return›
                  //                      AND IS ‹return›
                  //                      WHEN ON NEXT LINE
                  pre.lineNumber < 1 + lineIndex))) &&
            'keyword')
        );
    }
  };

  /** @param {Context} context */
  goals[symbols.ECMAScriptGoal].initializeContext = context => {
    Object.assign(context, {captureKeyword});
  };
}

generateDefinitions({groups, goals, identities, symbols, keywords, tokens});

/** @typedef {import('./types').State} State */
/** @typedef {import('./types').Context} Context */

/**
 * @typedef {'await'|'break'|'case'|'catch'|'class'|'const'|'continue'|'debugger'|'default'|'delete'|'do'|'else'|'export'|'extends'|'finally'|'for'|'function'|'if'|'import'|'in'|'instanceof'|'new'|'return'|'super'|'switch'|'this'|'throw'|'try'|'typeof'|'var'|'void'|'while'|'with'|'yield'} ECMAScript.Keyword
 * @typedef {'interface'|'implements'|'package'|'private'|'protected'|'public'} ECMAScript.RestrictedWord
 * @typedef {'enum'} ECMAScript.FutureReservedWord
 * @typedef {'arguments'|'async'|'as'|'from'|'of'|'static'} ECMAScript.ContextualKeyword
 * @typedef {Record<ECMAScript.Keyword|ECMAScript.RestrictedWord|ECMAScript.FutureReservedWord|ECMAScript.ContextualKeyword, symbol>} ECMAScript.Keywords
 */

// //@ts-ignore
// const keywords = {};

// function Symbolic(key, description = key) {
//   return (symbols[key] = Symbol(description));
// }

// import {Matcher} from '../../../modules/matcher/matcher.js';

const matcher = (ECMAScript =>
  Matcher.define(
    // Matcher generator for this matcher instance
    entity =>
      Matcher.join(
        entity(ECMAScript.Break()),
        entity(ECMAScript.Whitespace()),
        entity(ECMAScript.Escape()),
        entity(ECMAScript.Comment()),
        entity(ECMAScript.StringLiteral()),
        entity(ECMAScript.TemplateLiteral()),
        entity(ECMAScript.Opener()),
        entity(ECMAScript.Closer()),
        entity(ECMAScript.Solidus()),
        entity(ECMAScript.Operator()),
        entity(ECMAScript.Keyword()),
        entity(ECMAScript.Number()),
        entity(ECMAScript.Identifier()),

        // Defines how to address non-entity character(s):
        entity(
          ECMAScript.Fallthrough({
            type: 'fault',
            flatten: true,
          }),
        ),
      ),
    // RegExp flags for this matcher instance
    'gu',
    // Property descriptors for this matcher instance
    {
      goal: {value: ECMAScriptGoal, enumerable: true, writable: false},
    },
  ))({
  Fallthrough: ({fallthrough = '.', type, flatten} = {}) =>
    Matcher.define(
      (typeof fallthrough === 'string' || (fallthrough = '.'), type && typeof type === 'string')
        ? entity => Matcher.sequence`(
            ${fallthrough}
            ${entity((text, entity, match, state) => {
              capture(
                type !== 'fault'
                  ? type || state.context.goal.type || 'sequence'
                  : state.context.goal !== ECMAScriptGoal
                  ? state.context.goal.type || 'sequence'
                  : fault(text, state),
                match,
                text,
              );
              typeof flatten === 'boolean' && (match.flatten = flatten);
            })}
          )`
        : entity => `${fallthrough}`,
    ),
  Break: ({lf = true, crlf = false} = {}) =>
    Matcher.define(
      entity => Matcher.sequence`(
        ${Matcher.join(lf && '\\n', crlf && '\\r\\n')}
        ${entity((text, entity, match, state) => {
          // const group = state.context.group;
          match.format = 'whitespace';
          capture(
            state.context.group !== undefined && state.context.group.closer === '\n'
              ? close(text, state) || (state.context.goal === CommentGoal ? 'break' : 'closer')
              : 'break',
            match,
            text,
          );
          match.flatten = false;
        })}
      )`,
    ),
  Whitespace: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \s+
        ${entity((text, entity, match, state) => {
          match.format = 'whitespace';
          capture((match.flatten = state.lineOffset !== match.index) ? 'whitespace' : 'inset', match, text);
        })}
      )`,
    ),
  Escape: ({
    ECMAScriptUnicodeIDStart = RegExp(
      Matcher.sequence`[${UnicodeIDStart}]+`,
      UnicodeIDContinue.includes('\\p{') ? 'u' : '',
    ),
    ECMAScriptUnicodeIDContinue = RegExp(
      Matcher.sequence`[${UnicodeIDContinue}]+`,
      UnicodeIDContinue.includes('\\p{') ? 'u' : '',
    ),
  } = {}) =>
    Matcher.define(
      entity => Matcher.sequence`(
        \\u[${HexDigit}][${HexDigit}][${HexDigit}][${HexDigit}]
        ${entity((text, entity, match, state) => {
          match.format = 'escape';
          capture(
            state.context.goal.type ||
              (state.context.goal === ECMAScriptGoal &&
              state.lastToken != null &&
              (state.lastToken.type === 'identifier'
                ? ECMAScriptUnicodeIDContinue.test(String.fromCodePoint(parseInt(text.slice(2), 16)))
                : ECMAScriptUnicodeIDStart.test(String.fromCodePoint(parseInt(text.slice(2), 16))))
                ? ((match.flatten = true), 'identifier')
                : 'escape'),
            match,
            text,
          );
        })}
      )|(
        \\f|\\n|\\r|\\t|\\v|\\c[${ControlLetter}]
        |\\x[${HexDigit}][${HexDigit}]
        |\\u\{[${HexDigit}]*\}
        |\\[^]
        ${entity((text, entity, match, state) => {
          capture(state.context.goal.type || 'escape', match, (match.capture[keywords[text]] = text));
        })}
      )`,
    ),
  Comment: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \/\/|\/\*
        ${entity((text, entity, match, state) => {
          // const context = state.context;
          match.format = 'punctuation';
          capture(
            state.context.goal === ECMAScriptGoal
              ? open(text, state) ||
                  // Safely fast skip to end of comment
                  (forward(text === '//' ? '\n' : '*/', match, state),
                  // No need to track delimiter
                  (match.punctuator = CommentGoal.type),
                  'opener')
              : state.context.goal !== CommentGoal
              ? state.context.goal.type || 'sequence'
              : state.context.group.closer !== text
              ? CommentGoal.type
              : close(text, state) || (match.punctuator = CommentGoal.type),
            match,
            text,
          );
        })}
      )`,
    ),
  StringLiteral: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        "|'
        ${entity((text, entity, match, state) => {
          // const context = state.context;
          match.format = 'punctuation';
          capture(
            state.context.goal === ECMAScriptGoal
              ? open(text, state) ||
                  // TODO: Investigate why regexp forward is slow
                  // (void forward(text === '"' ? /(?:[^"\\\n]+?(?=\\.|")|\\.)*?"/g : /(?:[^'\\\n]+?(?=\\.|')|\\.)*?'/g, match, state)) ||
                  ((match.punctuator = StringGoal.type), 'opener')
              : state.context.goal !== StringGoal
              ? state.context.goal.type || 'sequence'
              : state.context.group.closer !== text
              ? StringGoal.type
              : ((match.flatten = false), close(text, state) || ((match.punctuator = StringGoal.type), 'closer')),
            match,
            text,
          );
        })}
      )`,
    ),
  TemplateLiteral: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        ${'`'}
        ${entity((text, entity, match, state) => {
          // const context = state.context;
          match.format = 'punctuation';
          capture(
            state.context.goal === ECMAScriptGoal
              ? open(text, state) || ((match.punctuator = TemplateLiteralGoal.type), 'opener')
              : state.context.goal !== TemplateLiteralGoal
              ? state.context.goal.type || 'sequence'
              : state.context.group.closer !== text
              ? TemplateLiteralGoal.type
              : close(text, state) || ((match.punctuator = TemplateLiteralGoal.type), 'closer'),
            match,
            text,
          );
        })}
      )`,
    ),
  Opener: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \$\{|\{|\(|\[
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          capture(
            state.context.goal.punctuators !== undefined && state.context.goal.punctuators[text] === true
              ? (match.punctuator = 'combinator')
              : state.context.goal.openers &&
                state.context.goal.openers[text] === true &&
                // (text !== '[' || state.context.goal !== RegExpGoal || state.context.group.opener !== '[')
                (state.context.goal !== RegExpGoal || state.context.group.opener !== '[')
              ? open(text, state) || 'opener'
              : state.context.goal.type || 'sequence',
            match,
            text,
          );
        })}
      )`,
    ),
  Closer: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \}|\)|\]
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          capture(
            state.context.goal.punctuators && state.context.goal.punctuators[text] === true
              ? (match.punctuator = 'combinator')
              : state.context.goal.closers &&
                state.context.goal.closers[text] === true &&
                (state.context.goal !== RegExpGoal ||
                  (state.context.group.opener !== '[' || text === state.context.group.closer))
              ? close(text, state) || 'closer'
              : state.context.goal.type || 'sequence',
            match,
            text,
          );
        })}
      )`,
    ),
  Solidus: () =>
    // TODO: Refine the necessary criteria for RegExp vs Div
    // SEE: https://github.com/sweet-js/sweet-core/wiki/design
    // SEE: https://inimino.org/~inimino/blog/javascript_semicolons
    // SEE: https://github.com/guybedford/es-module-shims/blob/master/src/lexer.js
    Matcher.define(
      entity => Matcher.sequence`(
        \*\/|\/=|\/
        ${entity((text, entity, match, state) => {
          // const context = state.context;
          match.format = 'punctuation';
          capture(
            state.context.goal === CommentGoal
              ? (state.context.group.closer === text && close(text, state)) ||
                  (match.punctuator = state.context.goal.type)
              : state.context.goal === RegExpGoal && state.context.group.closer !== ']' // ie /…*/ or /…/
              ? close('/', state) || ((match.punctuator = state.context.goal.type), 'closer')
              : state.context.goal !== ECMAScriptGoal
              ? state.context.goal.type || 'sequence'
              : text[0] === '*'
              ? fault(text, state)
              : state.lastAtom === undefined ||
                (state.lastAtom.type === 'operator'
                  ? state.lastAtom.text !== '++' && state.lastAtom.text !== '--'
                  : state.lastAtom.type === 'closer'
                  ? state.lastAtom.text === '}'
                  : state.lastAtom.type === 'opener' || state.lastAtom.type === 'keyword')
              ? open(text, state) || ((match.punctuator = 'pattern'), 'opener')
              : (match.punctuator = 'operator'),
            match,
            text,
          );
        })}
      )`,
    ),
  Operator: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        ,|;|\.\.\.|\.|:|\?|=>
        |\+\+|--
        |\+=|-=|\*\*=|\*=
        |&&|&=|&|\|\||\|=|\||%=|%|\^=|\^|~=|~
        |<<=|<<|<=|<|>>>=|>>>|>>=|>>|>=|>
        |!==|!=|!|===|==|=
        |\+|-|\*\*|\*
        ${entity((text, entity, match, state) => {
          // const context = state.context;
          match.format = 'punctuation';
          capture(
            state.context.goal === ECMAScriptGoal
              ? 'operator'
              : state.context.goal.punctuators && state.context.goal.punctuators[text] === true
              ? (match.punctuator = 'punctuation')
              : state.context.goal.type || 'sequence',
            match,
            text,
          );
        })}
      )`,
    ),
  Keyword: () =>
    // TODO: Handle contextual cases:
    //  - { get() set() } as Identifiers
    Matcher.define(
      entity => Matcher.sequence`\b(
        ${Matcher.join(...keywords).replace(/\./g, '\\.')}
        ${entity((text, entity, match, state) => {
          match.format = 'identifier';
          capture(
            (match.flatten = state.context.goal !== ECMAScriptGoal)
              ? state.context.goal.type || 'sequence'
              : state.lastAtom !== undefined && state.lastAtom.text === '.'
              ? 'identifier'
              : state.context.captureKeyword === undefined
              ? 'keyword'
              : state.context.captureKeyword(text, state) || fault(text, state),
            match,
            text,
          );

          // : ((keywordSymbol = keywords[text]), (previousAtom = state.lastAtom)) && previousAtom.text === '.'
          // keywordSymbol &&
          //   ((context.keywords = (context.keywords || 0) + 1),
          //   (context[`${(match.capture[keywordSymbol] = text)}-keyword-index`] = match.index));
        })}
      )\b(?=[^\s$_:]|\s+[^:]|$)`,
    ),
  Identifier: ({RegExpFlags = /^[gimsuy]+$/} = {}) =>
    Matcher.define(
      entity => Matcher.sequence`(
        [${UnicodeIDStart}][${UnicodeIDContinue}]*
        ${entity((text, entity, match, state) => {
          // let previousToken;
          match.format = 'identifier';
          capture(
            state.context.goal !== ECMAScriptGoal
              ? state.context.goal.type || 'sequence'
              : // : (previousToken = state.lastToken) && previousToken.punctuator === 'pattern' && RegExpFlags.test(text)
              state.lastToken !== undefined && state.lastToken.punctuator === 'pattern' && RegExpFlags.test(text)
              ? ((match.flatten = true), (match.punctuator = RegExpGoal.type), 'closer')
              : ((match.flatten = true), 'identifier'),
            match,
            text,
          );
        })}
      )`,
      `${UnicodeIDStart}${UnicodeIDContinue}`.includes('\\p{') ? 'u' : '',
    ),
  Number: ({
    NumericSeparator,
    Digits = NumericSeparator
      ? Digit => Matcher.sequence`[${Digit}][${Digit}${Matcher.escape(NumericSeparator)}]*`
      : Digit => Matcher.sequence`[${Digit}]+`,
    DecimalDigits = Digits(DecimalDigit),
    HexDigits = Digits(HexDigit),
    BinaryDigits = Digits(BinaryDigit),
  } = {}) =>
    Matcher.define(
      entity => Matcher.sequence`\b(
        ${DecimalDigits}\.${DecimalDigits}[eE]${DecimalDigits}
        |\.${DecimalDigits}[eE]${DecimalDigits}
        |0[xX]${HexDigits}
        |0[bB]${BinaryDigits}
        |${DecimalDigits}\.${DecimalDigits}
        |\.${DecimalDigits}
        |${DecimalDigits}
        ${entity((text, entity, match, state) => {
          match.format = 'number';
          capture(state.context.goal.type || 'number', match, text);
        })}
      )\b`,
    ),
});

/// <reference path="./types.d.ts" />

const {
  createTokenFromMatch,
  createMatcherInstance,
  createString,
  createMatcherTokenizer,
  createMatcherMode,
} = (() => {
  const {
    RegExp,
    Object,
    Object: {assign, create, freeze, defineProperty, defineProperties, getOwnPropertyNames, setPrototypeOf},
    String,
  } = globalThis;

  /** @typedef {RegExpConstructor['prototype']} Matcher */

  /**
   * @template {Matcher} T
   * @template {{}} U
   * @param {T} matcher
   * @param {TokenizerState<T, U>} [state]
   * @returns {TokenMatcher<U>}
   */
  const createMatcherInstance = (matcher, state) =>
    defineProperty(
      ((state || (state = create(null))).matcher =
        (matcher && matcher instanceof RegExp && createMatcherClone(matcher)) || RegExp(matcher, 'g')),
      'state',
      {value: state},
    );

  /**
   * @template {Matcher} T
   * @template {T} U
   * @template {{}} V
   * @type {(matcher: T & V, instance?: U) => U & V}
   * @param {T} param0
   * @param {U} [param1]
   * @returns {U}
   */
  const createMatcherClone = ({constructor: {prototype}, source, flags, lastIndex, ...properties}, instance) => (
    (instance = assign(instance || RegExp(source, flags || 'g'), properties)),
    prototype && setPrototypeOf(instance, prototype),
    instance
  );

  /** @type {(value: any) => string} */
  const createString = String;

  /**
   * @type {<M extends MatchArray, T extends {}>(init: MatchResult<M>) => Token<T>}
   * @param {MatchResult<MatchArray>} param0
   */
  const createTokenFromMatch = ({0: text, identity, capture, index}) => ({
    type: (identity && (identity.description || identity)) || 'text',
    text,
    lineBreaks: countLineBreaks(text),
    lineInset: (capture && capture.inset) || '',
    offset: index,
    capture,
  });

  const tokenizerProperties = Object.getOwnPropertyDescriptors(
    freeze(
      class Tokenizer {
        /** @template {Matcher} T @template {{}} U */
        *tokenize() {
          /** @type {Token<U>} */
          // let next;
          /** @type {{createToken: typeof createTokenFromMatch, initializeState: <V>(state: V) => V & TokenizerState<T, U>}} */
          const createToken = (this && this.createToken) || createTokenFromMatch;
          /** @type {string} */
          const string = createString(Object.keys({[arguments[0]]: 1})[0]);
          /** @type {TokenMatcher<U>} */
          const matcher = createMatcherInstance(this.matcher, assign(arguments[1] || {}, {sourceText: string}));
          /** @type {TokenizerState<T, U>} */
          const state = matcher.state;
          this.initializeState && this.initializeState(state);
          matcher.exec = matcher.exec;

          for (
            let match, capturedToken, retainedToken, index = 0;
            // BAIL on first failed/empty match
            ((match = matcher.exec(string)) !== null && match[0] !== '') ||
            //   BUT first yield a nextToken if present
            (retainedToken !== undefined && (yield retainedToken), (state.nextToken = undefined));

          ) {
            if ((capturedToken = createToken(match, state)) === undefined) continue;

            // HOLD back one grace token
            //   until createToken(…) !== undefined (ie new token)
            //   set the incremental token index for this token
            //   and keep it referenced directly on the state
            (state.nextToken = capturedToken).index = index++;

            //   THEN yield a previously held token
            if (retainedToken !== undefined) yield retainedToken;

            //   THEN finally clear the nextToken reference
            retainedToken = capturedToken;
            state.nextToken = undefined;
          }

          this.finalizeState && this.finalizeState(state);

          // console.log({...state});
        }
      }.prototype,
    ),
  );

  /**
   * @type { {<T extends Matcher, U extends {} = {}>(sourceText: string, initialState?: Partial<TokenizerState<undefined, U>): IterableIterator<Token<U>>} }
   */
  const createMatcherTokenizer = instance => defineProperties(instance, tokenizerProperties);

  /**
   * @param {import('/modules/matcher/matcher.js').Matcher} matcher
   * @param {any} [options]
   */
  const createMatcherMode = (matcher, options) => {
    const tokenizer = createMatcherTokenizer({
      createToken: createTokenFromMatch,
      /** @type {(state: {}) =>  void} */
      initializeState: undefined,
      finalizeState: undefined,
      matcher: freeze(createMatcherInstance(matcher)),
    });

    const mode = {syntax: 'matcher', tokenizer};
    options &&
      ({
        syntax: mode.syntax = mode.syntax,
        aliases: mode.aliases,
        preregister: mode.preregister,
        createToken: tokenizer.createToken = tokenizer.createToken,
        initializeState: tokenizer.initializeState,
        finalizeState: tokenizer.finalizeState,
        ...mode.overrides
      } = options);

    freeze(tokenizer);

    return mode;
  };

  return {createTokenFromMatch, createMatcherInstance, createString, createMatcherTokenizer, createMatcherMode};
})();

//@ts-check

const mode = createMatcherMode(matcher, {
  syntax: 'ecmascript',
  aliases: ['es', 'js', 'javascript'],

  preregister: parser => {
    parser.unregister('es');
    parser.unregister('ecmascript');
  },

  initializeState,
  finalizeState,
  createToken,
});

const {syntax, tokenizer} = mode;

//@ts-check

/** @param {string} text @returns {TokenizerTokens} */
const tokenizeSourceText = text => tokenizer.tokenize(text, {console});

//@ts-check

const {esx, Rewriter} = (Rewriter => {
	const {escape, sequence, join} = Matcher;
	const {raw} = String;

	/**
	 * @param {TemplateStringsArray} strings
	 * @param {... string} values
	 */
	const regex = (strings, ...values) => RegExp(raw(strings, ...values), 'g');

	const word = word => sequence`\b${escape(word)}\b`;

	const MARK = '/*/';
	const MARKS = '/*@*/';
	const STARTS = '/*‹*/';
	const ENDS = '/*›*/';
	const LITERAL = '`([^`]*)`';

	const esx = {};

	esx.input = {
		MarkedExport: Rewriter(
			regex`${escape(MARK)}export${escape(MARK)}[\s\n]*(${'const let var async function class'
				.split(' ')
				.map(word)
				.join('|')})`,
			raw` ${MARKS}export $1`,
		),
		ModuleImport: Rewriter(regex`\bmodule\.import\b${LITERAL}`, raw` ${STARTS} import $1 ${ENDS} `),
		ModuleExport: Rewriter(regex`\bmodule\.export\b${LITERAL}`, raw` ${STARTS} export $1 ${ENDS} `),
		ModuleAwait: Rewriter(regex`\bmodule\.await\b[\s\n]*\(`, raw`module.await = (`),
		ModuleExportDefault: Rewriter(regex`\bmodule\.export\.default\b[\s\n]*=`, ` ${STARTS} export default ${ENDS} `),
	};
	(esx.output = {
		UnmarkedExport: Rewriter(regex` ${escape(MARKS)}export `, raw`${MARK}export${MARK} `),
		WrappedExportDefault: Rewriter(regex` ${escape(STARTS)} export default ${escape(ENDS)} `, raw`exports.default =`),
		UntaggedExpression: Rewriter(regex` ${escape(STARTS)}([^]*?)${escape(ENDS)} `, raw`${MARK}$1${MARK}`),
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

//@ts-check

const {parseModuleText, parseDynamicModuleEvaluator} = (() => {
	const {
		DEBUG_COMPILER,
		DEBUG_CONSTRUCTS,
		DEBUG_NODES,
		INTERNAL_CONSOLE,
		FORCE_INCOMPLETE_CONSTRUCTS = true,
	} = getFlags();

	/** @type {Console} */
	const console =
		(globalThis.console && (INTERNAL_CONSOLE !== false && globalThis.console['internal'])) || globalThis.console;

	const {log, warn, group, groupCollapsed, groupEnd, table} = console;

	/** @param {string} sourceText @param {ModuleSource} [sourceRecord] */
	const compileModule = (sourceText, sourceRecord) => {
		sourceRecord || (sourceRecord = new ModuleSource({sourceText: sourceText}));

		/** @type {ModuleSource['fragments']} */
		const fragments = (sourceRecord.fragments = []);
		/** @type {ModuleSource['bindings']} */
		const bindings = (sourceRecord.bindings = []);

		const nonBindings = [];
		const tokens = tokenizeSourceText(sourceText);
		const collator = new Collator('ECMAScript');

		collator.log = log;

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

		if (constructs.length) {
			let bindingRecord;
			const constructList = [];

			for (const construct of constructs) {
				constructList.push(construct.type);
				bindingRecord = createBindingRecordFromConstruct(construct, sourceRecord);
				if (bindingRecord === undefined) {
					nonBindings.push(construct);
					continue;
				}
				bindings.push(bindingRecord);
			}

			if (DEBUG_CONSTRUCTS) {
				bindings.length && table(bindings);
				nonBindings.length && table(nonBindings);
				// console.log(constructList.map(v => `- \`${v}\``).join('\n'));
			}
		}

		return sourceRecord;
	};

	/**
	 * @param {ConstructNode} construct
	 * @param {SourceRecord} sourceRecord
	 * @returns {BindingRecord}
	 */
	const createBindingRecordFromConstruct = (construct, sourceRecord) => {
		const record = {};

		const bindingIntent = (record.bindingIntent = construct.type.startsWith('import')
			? 'import'
			: construct.type.startsWith('export')
			? 'export'
			: undefined);

		record.declarationText =
			bindingIntent === construct.type || bindingIntent === undefined || construct.type === 'export default'
				? construct.type
				: construct.type.slice(bindingIntent.length + 1);

		record.bindingDeclaration = ModuleBinding.DeclarationType[record.declarationText];

		if (record.bindingDeclaration !== undefined) {
			return createDeclarationRecord(construct, record, sourceRecord);
		}
	};

	// * @param {Node} node
	/**
	 * @param {ConstructNode} construct
	 * @param {*} record
	 * @param {SourceRecord} sourceRecord
	 * @returns {BindingRecord}
	 */
	const createDeclarationRecord = (construct, record, sourceRecord) => {
		/** @type {Node} */
		let node = construct[NextTokenNode];
		const bindingTarget = construct[BindingClause] != null ? construct[BindingClause].text : undefined;

		switch (record.bindingDeclaration) {
			case 'FunctionDeclaration':
			case 'AsyncFunctionDeclaration':
			case 'GeneratorFunctionDeclaration':
			case 'AsyncGeneratorFunctionDeclaration':
			case 'ClassDeclaration':
				if (node.type !== 'identifier') {
					sourceRecord.error(`ConstructError: ${record.bindingDeclaration} must have a valid identifier`, {
						lineNumber: construct.lastToken.lineNumber,
						columnNumber: construct.lastToken.columnNumber,
					});
					if (!FORCE_INCOMPLETE_CONSTRUCTS) break;
					else if (DEBUG_CONSTRUCTS) log(record.bindingDeclaration, construct, node);
				}
				record.internalIdentifier = bindingTarget;
				record.internalType = record.bindingDeclaration === 'ClassDeclaration' ? 'class' : 'function';
				if (record.bindingIntent === 'export') {
					record.exportedIdentifier = record.internalIdentifier;
					record.exportedType = 'readonly';
				}
				return createBindingRecord(record);
			case 'VariableDeclaration':
				record.internalType = record.declarationText;
				if (node.type === '{…}') {
					// TODO: Destructure bindings
					if (!FORCE_INCOMPLETE_CONSTRUCTS) break;
					else if (DEBUG_CONSTRUCTS) log(record.bindingDeclaration, construct, node);
				} else if (node.type === 'identifier') {
					record.internalIdentifier = bindingTarget;
					if (record.bindingIntent === 'export') {
						record.exportedIdentifier = record.internalIdentifier;
						record.exportedType = record.internalType === 'const' ? 'constant' : 'readonly';
					}
				}
				return createBindingRecord(record);
			case 'ExportDefaultAssignmentExpression':
				record.exportedType = 'constant';
				record.internalType = 'void';
				record.exportedIdentifier = 'default';
				return createBindingRecord(record);
			case 'ImportDeclaration':
				if (node.text === '*') {
					record.importedIdentifier = '*';
					record.internalIdentifier = bindingTarget;
				} else if (node.type === 'string') {
					record.externalModuleSpecifier = node.text.slice(1, -1);
				} else if (node.type === 'identifier') {
					record.importedIdentifier = 'default';
					record.internalIdentifier = bindingTarget;
					// TODO: import default, {} // if (trailer.nextToken.text !== ',')
				} else if (node.type === '{…}') {
					// TODO: import {…}
					if (!FORCE_INCOMPLETE_CONSTRUCTS) break;
					else if (DEBUG_CONSTRUCTS) log(record.bindingDeclaration, construct, node);
				}
				return createBindingRecord(record);
			case 'ExportDeclaration':
				if (node.text === '*') {
					record.exportedIdentifier = bindingTarget;
				} else if (node.type === '{…}') {
					// TODO: export {…}
					if (!FORCE_INCOMPLETE_CONSTRUCTS) break;
					else if (DEBUG_CONSTRUCTS) log(record.bindingDeclaration, construct, node);
				}
				return createBindingRecord(record);
		}
		log(record.bindingDeclaration, construct, node);
	};

	/** @param {BindingRecord} record */
	/** @returns {BindingRecord} */
	const createBindingRecord = record => new ModuleBinding(record);

	/** @param {string} sourceText @param {ModuleSource} [sourceRecord] */
	const parseModuleText = (sourceText, sourceRecord) => {
		sourceRecord
			? (sourceRecord.sourceText = sourceText)
			: (sourceRecord = new ModuleSource({sourceText: sourceText, sourceType: 'module-text'}));
		return compileModule(sourceText, sourceRecord);
	};

	const SourceEvaluatorText = /^[\s\n]*module[\s\n]*=>[\s\n]*void[\s\n]*\([\s\n]*\([\s\n]*\)[\s\n]*=>[\s\n]*\{[ \t]*?\n?([^]*[\s\n]*?)\s*\}[\s\n]*\)[\s\n]*;?[\s\n]*$/;

	/** @param {Function|string} sourceEvaluator @param {ModuleSource} [sourceRecord] */
	const parseDynamicModuleEvaluator = (sourceEvaluator, sourceRecord) => {
		const sourceType = 'evaluator';

		//@ts-ignore
		const [, sourceEvaluatorText] = SourceEvaluatorText.exec(sourceEvaluator);

		const sourceText = esx.rewriteEvaluatorInput(sourceEvaluatorText);

		sourceRecord
			? (sourceRecord.sourceType = sourceType)
			: (sourceRecord = new ModuleSource({sourceEvaluatorText, sourceText, sourceType}));
		parseModuleText(sourceText, sourceRecord);

		sourceRecord.compiledEvaluatorText = esx.rewriteEvaluatorOutput(sourceRecord.compiledText); // debugger;

		DEBUG_COMPILER
			? environment.process
				? log('%o\n\n%o', sourceRecord, sourceText)
				: log(
						'%O\n%c%ssourceEvaluatorText: %s\nsourceText: %s\ncompiledText: %s\ncompiledEvaluatorText: %s',
						sourceRecord,
						sourceEvaluatorText,
						sourceText,
						sourceRecord.compiledText,
						sourceRecord.compiledEvaluatorText,
				  )
			: DEBUG_CONSTRUCTS &&
			  (environment.process
					? log('%O\n%s', sourceRecord, sourceText)
					: log('%O\n%c%s', sourceRecord, 'whitespace: pre; font:monospace;', sourceText));
		return sourceRecord;
	};

	return {parseModuleText, parseDynamicModuleEvaluator};

	/** @param {{[name: string]: boolean}} param0 */
	function getFlags({DEBUG_COMPILER, DEBUG_CONSTRUCTS, DEBUG_NODES} = {}) {
		if (typeof location === 'object' && 'search' in location) {
			DEBUG_COMPILER = /\bcompiler\b/.test(location.search);
			DEBUG_NODES = /\bnodes\b/.test(location.search);
			DEBUG_CONSTRUCTS = /\bconstructs\b/.test(location.search);
		} else if (typeof process === 'object' && process.argv) {
			DEBUG_COMPILER = process.argv.includes('--compiler');
			DEBUG_NODES = process.argv.includes('--nodes');
			DEBUG_CONSTRUCTS = process.argv.includes('--constructs');
		}
		return {DEBUG_COMPILER, DEBUG_CONSTRUCTS, DEBUG_NODES};
	}
})();

/** @type {(init: {source: Function | string, url: string}) => Evaluator} */
const ModuleEvaluator = (() => {
	const evaluate = code => (0, eval)(code);

	const rewrite = source =>
		// TODO: Handle shadows and redudant exports!
		`${source}`.replace(Exports, (match, guard, mappings) => {
			const bindings = [];
			while ((match = Mappings.exec(mappings))) {
				let {1: identifier, 2: binding} = match;
				bindings.push(`${binding || '()'} => ${identifier}`);
			}
			return (bindings.length && `exports(${bindings.join(', ')})`) || '';
		});

	return ({
		source,
		sourceText = `${source}`,
		url: moduleURL,
		compiledText = rewrite(
			typeof source === 'function' ? parseDynamicModuleEvaluator(source).compiledEvaluatorText : sourceText,
		),
	}) => {
		let match;

		/** @type {Evaluator} */
		const evaluator = evaluate(
			`(function* (module, exports) { with(module.scope) (function () { "use strict";\n${compiledText}${
				moduleURL ? `//# sourceURL=${`${new URL(moduleURL, 'file:///')}`.replace(/^file:/i, 'virtual:')}\n` : ''
			}})();})`,
		);
		evaluator.sourceText = sourceText;
		evaluator.compiledText = compiledText;
		evaluator.moduleURL = moduleURL;
		const links = (evaluator.links = {});

		while ((match = BindingDeclarations.exec(compiledText))) {
			const [, intent, bindings, binding, , specifier] = match;
			const mappings = (
				(binding && ((binding.startsWith('* ') && binding) || `default as ${binding}`)) ||
				bindings ||
				''
			).split(/ *, */g);
			while ((match = Mappings.exec(mappings))) {
				const [, identifier, binding = identifier] = match;
				freeze((links[binding] = {intent, specifier, identifier, binding}));
			}
		}

		freeze(links);

		return evaluator;
	};
})();

/** @typedef {import('./types').modules.Module.Context} Context */
/** @typedef {import('./types').modules.Module.Exports} Exports */
/** @typedef {import('./types').modules.Module.Links} Links */
/** @typedef {import('./types').modules.DynamicModule.Evaluator} Evaluator */

function ModuleNamespace() {}
{
	const toPrimitive = setPrototypeOf(() => 'ModuleNamespace', null);
	const toString = setPrototypeOf(() => 'class ModuleNamespace {}', null);
	const {toJSON} = {
		toJSON() {
			return Object.getOwnPropertyNames(this);
		},
	};
	ModuleNamespace.prototype = create(null, {
		[Symbol.toPrimitive]: {value: toPrimitive, enumerable: false},
		[Symbol.toStringTag]: {value: 'ModuleNamespace', enumerable: false},
		toJSON: {value: toJSON, enumerable: false},
	});
	freeze(setPrototypeOf(ModuleNamespace, create(null, {toString: {value: toString}})));
}

class ModuleStrapper {
	/** @type {import('./namespaces').ModuleNamespaces} */
	get map() {
		if (this !== this.constructor.prototype) return setProperty(this, 'map', create(null));
	}

	throw(error) {
		throw error;
	}

	// async createLinkedBinding(namespaces, linkURL, linkedBinding, bindingRecords, bindingIdentifier) {
	async createLinkedImportBinding(bindingStatus) {
		let exportedNamespace;
		const {
			namespaces,
			linkURL,
			linkingRecord,
			moduleURL,
			bindingRecords,
			bindingIdentifier,
			moduleContext,
			traceId,
			linkedNamespace = (bindingStatus.linkedNamespace = namespaces[linkURL] || namespaces.import(linkURL)),
		} = bindingStatus;
		bindingStatus.traceId && console.log(bindingStatus.traceId, bindingStatus);
		linkedNamespace ||
			this.throw(
				new ReferenceError(
					`Cannot create linked imported binding against ‹${linkURL}› prior to the creation of its namespace record`,
				),
			);
		bindingIdentifier ||
			this.throw(new ReferenceError(`Cannot create linked import binding without a binding identifier`));

		// Make a TBD binding
		bindProperty(bindingRecords, bindingIdentifier, undefined, true, true);

		// Make the actual binding
		linkingRecord.identifier !== '*'
			? copyProperty(
					bindingRecords,
					(exportedNamespace =
						bindingStatus.exportedNamespace || (bindingStatus.exportedNamespace = await linkedNamespace)),
					linkingRecord.identifier,
					bindingIdentifier,
			  )
			: ((exportedNamespace =
					bindingStatus.exportedNamespace || (bindingStatus.exportedNamespace = await linkedNamespace)),
			  copyProperty(bindingRecords, namespaces, linkURL, bindingIdentifier));
		// Update linked binding status
		bindingStatus.isLinked = true;

		bindingStatus.traceId && console.log(bindingStatus.traceId, bindingStatus);
	}
	async createLinkedExportBinding(bindingStatus) {
		let exportedNamespace;
		const {
			namespaces,
			linkURL,
			linkingRecord,
			moduleURL,
			bindingRecords,
			bindingIdentifier,
			moduleContext,
			traceId,
			linkedNamespace = (bindingStatus.linkedNamespace = namespaces[linkURL] || namespaces.import(linkURL)),
		} = bindingStatus;

		bindingStatus.traceId && console.log(bindingStatus.traceId, bindingStatus);

		linkedNamespace ||
			this.throw(
				new ReferenceError(
					`Cannot create linked export binding against ‹${linkURL}› prior to the creation of its namespace record`,
				),
			);

		// Make a TBD binding
		bindProperty(moduleContext.namespace, bindingIdentifier, undefined, true, true);

		// Make the actual binding
		linkingRecord.identifier !== '*'
			? ((exportedNamespace =
					bindingStatus.exportedNamespace || (bindingStatus.exportedNamespace = await linkedNamespace)),
			  copyProperty(moduleContext.namespace, exportedNamespace, linkingRecord.identifier, bindingIdentifier))
			: this.throw(
					new TypeError(
						`Cannot create linked "export * as" binding against ‹${linkURL}› since it is not a valid binding type`,
					),
			  );

		// Update linked binding status
		bindingStatus.isLinked = true;

		bindingStatus.traceId && console.log(bindingStatus.traceId, bindingStatus);
	}

	link(module) {
		let linkURL, bindingStatus;
		const {namespaces, context: moduleContext, bindings: bindingRecords, links, url: moduleURL} = module;

		const promises = [];

		for (const [bindingIdentifier, linkingRecord] of entries(links)) {
			if (
				!(linkingRecord.intent === 'import' || linkingRecord.intent === 'export') ||
				!(linkURL = linkingRecord.url || (linkingRecord.specifier && this.resolve(linkingRecord.specifier, moduleURL)))
			)
				continue;

			bindingStatus = {
				isLinked: false,
				namespaces,
				linkURL,
				linkingRecord,
				moduleURL,
				bindingRecords,
				bindingIdentifier,
				moduleContext,
				// traceId: `${linkingRecord.intent} ${moduleURL}#${bindingIdentifier} ‹ ${linkURL}#${linkingRecord.identifier}`,
			};

			bindingStatus.traceId && console.log(bindingStatus.traceId, bindingStatus);
			promises.push(
				(bindingStatus.promise = this[
					linkingRecord.intent === 'import' ? 'createLinkedImportBinding' : 'createLinkedExportBinding'
				](bindingStatus)),
			);
		}

		return promises.length ? Promise.all(promises).then(() => {}) : Promise.resolve();
	}

	instantiate(module) {
		const enumerable = false;
		const namespace = new ModuleNamespace();
		const {context, bindings, namespaces, url, scope} = module;

		context.export = (...exports) => void this.bind(namespace, ...exports);

		Reflect.defineProperty(context.export, 'default', {
			set: value => void this.bind(namespace, {default: () => value}),
		});

		freeze(context.export);

		setProperty(bindings, 'module', context, false, true);
		setProperty(context, 'namespace', namespace);
		setProperty(context, 'scope', setPrototypeOf(bindings, scope || null), enumerable, false);
		setProperty(context, 'meta', create(null), false, false);
		setProperty(context.scope, 'meta', context.meta, false, false);
		setProperty(context.meta, 'url', url);

		// TODO: To be used for top-level await
		let awaits = void Reflect.defineProperty(context, 'await', {get: () => awaits, set: value => (awaits = value)});

		freeze(context);
		return setProperty(module, 'instance', {namespace, context});
	}

	async evaluate(module) {
		const {bindings, namespace, context} = await module.instantiate();
		try {
			// TODO: Ensure single execution
			module.evaluator(context, context.export).next();
			!context.await || (await context.await);
			return setProperty(module, 'namespace', namespace);
		} catch (exception) {
			console.warn(exception);
			setProperty(module, 'exception', exception);
		}
	}

	async import(url) {
		const module = this.map[url];
		return module.namespace || (await module.evaluate());
	}

	resolve(specifier, referrer) {
		specifier = `${(specifier && specifier) || ''}`;
		referrer = `${(referrer && referrer) || ''}` || '';
		const key = `[${referrer}][${specifier}]`;
		const cache = this.resolve.cache || (this.resolve.cache = {});
		let url = cache[key];
		if (url) return url.link;
		const {schema, domain} = Specifier.parse(specifier);
		const origin = (schema && `${schema}${domain || '//'}`) || `file:///`;
		referrer =
			(!referrer && origin) || (cache[`[${referrer}]`] || (cache[`[${referrer}]`] = new URL(referrer, origin))).href;
		url = cache[key] = new URL(specifier, referrer);
		return (url.link = url.href.replace(/^file:\/\/\//, ''));
	}

	bind(namespace, ...bindings) {
		for (const binding of bindings) {
			const type = typeof binding;
			if (type === 'function') {
				const identifier = (Identifier.exec(binding) || '')[0];
				identifier && bindProperty(namespace, identifier, binding, true);
			} else if (type === 'object') {
				for (const identifier in binding) {
					identifier === (Identifier.exec(identifier) || '')[0] &&
						bindProperty(namespace, identifier, binding[identifier], true);
				}
			}
		}
	}
}


/** @typedef {import('./types').modules.Namespaces} Namespaces */

//@ts-check

/** @augments {Module} */
class DynamicModule {
	/** @param {string} url @param {Function} evaluator @param {Scope} scope */
	constructor(url, evaluator, scope) {
		const enumerable = false;
		setProperty(this, 'url', url, enumerable);
		setProperty(this, 'evaluator', (evaluator = ModuleEvaluator({source: evaluator, url})), enumerable);
		setProperty(this, 'scope', scope, enumerable);
		//@ts-ignore
		setProperty(this, 'context', create(null, contextuals), enumerable, false);
		setProperty(this, 'bindings', create(null), enumerable);
		//@ts-ignore
		setProperty(this, 'links', {...evaluator.links}, enumerable, false);

		this.namespaces ||
			setProperty(new.target.prototype, 'namespaces', new ModuleNamespaces(url => new.target.import(url)), false);

		new.target.map[url] = this;
	}

	link() {
		const promise = DynamicModule.link(this);
		setProperty(this, 'link', () => promise);
		return promise;
	}

	instantiate() {
		const instance = this.instance || DynamicModule.instantiate(this);
		const promise = this.link().then(() => instance);
		setProperty(this, 'instantiate', () => promise);
		return promise;
	}

	evaluate() {
		const promise = DynamicModule.evaluate(this).then(() => this.namespace);
		setProperty(this, 'evaluate', () => promise);
		return promise;
	}
}

/** Properties injected into every module context */
const contextuals = {};

DynamicModule.environment = environment;

// DynamicModule.environment = environment.

DynamicModule.debugging = (() => {
	const debug = (type, ...args) => {
		console.log(type, ...args);
		// type in debugging && debugging[type] null, args);
	};
	const debugging = (debug.debugging = {});
	contextuals.debug = {value: freeze(debug)};
	return debugging;
})();

{
	const moduleStrapper = new ModuleStrapper();
	/** @type {ModuleStrapper['map']} */
	DynamicModule.map = moduleStrapper.map;
	/** @type {ModuleStrapper['link']} */
	DynamicModule.link = moduleStrapper.link;
	/** @type {ModuleStrapper['instantiate']} */
	DynamicModule.instantiate = moduleStrapper.instantiate;
	/** @type {ModuleStrapper['evaluate']} */
	DynamicModule.import = moduleStrapper.import;
	/** @type {ModuleStrapper['evaluate']} */
	DynamicModule.evaluate = moduleStrapper.evaluate;

	DynamicModule.prototype.evaluator = undefined;
	/** @type {Module['url']} */
	DynamicModule.prototype.url = undefined;
	/** @type {Evaluator} */
	DynamicModule.prototype.evaluator = undefined;
	/** @type {Module['scope']} */
	DynamicModule.prototype.scope = undefined;
	/** @type {Module['context']} */
	DynamicModule.prototype.context = undefined;
	/** @type {Module['bindings']} */
	DynamicModule.prototype.bindings = undefined;
	/** @type {Module['links']} */
	DynamicModule.prototype.links = undefined;
	/** @type {Module['instance']} */
	DynamicModule.prototype.instance = undefined;
	/** @type {Module['namespace']} */
	DynamicModule.prototype.namespace = undefined;

	/** @type {Namespaces} */
	DynamicModule.prototype.namespaces = undefined;

	setPrototypeOf(DynamicModule, moduleStrapper);
}

/** @typedef {import('./types').modules.Namespaces} Namespaces */
/** @typedef {import('./types').modules.Module} Module */
/** @typedef {import('./types').modules.Module.Scope} Scope */
/** @typedef {import('./types').modules.DynamicModule.Evaluator} Evaluator */

GlobalScope.DynamicModules
	? 'DynamicModule' in GlobalScope.DynamicModules ||
	  ((GlobalScope.DynamicModules.ModuleScope = ModuleScope), (GlobalScope.DynamicModules.DynamicModule = DynamicModule))
	: (GlobalScope.DynamicModules = {ModuleScope, GlobalScope});
//# sourceMappingURL=modules.mjs.map
