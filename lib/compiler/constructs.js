//@ts-check
/// <reference path="./types.js"

import * as symbols from './symbols.js';

export const {Node, Root, Construct, Closure, Template, Text, Source, Binding} = (() => {
	const push = Function.call.bind(Array.prototype.push);

	/** @type {boolean} */
	const RETAIN_TOKEN_CONTEXTS = false;

	class Binding {}

	class Source {
		constructor() {
			/** @type {string} */
			this.compiledText = undefined;
			/** @type {Root} */
			this.rootNode = undefined;
			/** @type {string[]} */
			this.fragments = [];
			/** @type {Binding[]} */
			this.bindings = undefined;
			/** @type {Construct[]} */
			this.constructs = undefined;
		}

		toString() {
			return this.compiledText;
		}
	}

	class Node {
		/** @param {string} [nodeType] */
		constructor(nodeType) {
			this.nodeType = nodeType;

			if (new.target.RETAIN_TOKEN_CONTEXTS === true)
				/** @type {TokenizerContext} */
				this.context = undefined;

			/** @type {Root} */
			this.rootNode = undefined;
			/** @type {Node} */
			this.parentNode = this.previousNode = this.nextNode = undefined;
			/** @type {Token} */
			this.previousTokenNode = this.nextTokenNode = undefined;
			/** @type {Node[]} */
			this.children = undefined;
			this[Symbol.toStringTag] = nodeType == null ? new.target.name : `${new.target.name} ⟨${nodeType}⟩`;
			/** @type {TokenizerToken} */
			this.lastKeyword = this.lastOperator = this.lastBreak = undefined;
			/** @type {string} */
			this.text = undefined;

			/** @type {string} */
			this[symbols.CurrentConstruct] = undefined;
		}
	}

	Node.RETAIN_TOKEN_CONTEXTS = RETAIN_TOKEN_CONTEXTS;

	class Token extends Node {
		/** @param {TokenizerToken} token @param {string} [nodeType] */
		constructor(token, nodeType) {
			super((nodeType == null && token.type) || nodeType);
			this.text = token.text;
			this.token = this.firstToken = this.lastToken = token;
		}
	}

	class Text extends Node {
		/** @param {string} text @param {string} nodeType */
		constructor(text, nodeType) {
			super(nodeType);
			this.text = text;
			this.firstToken = this.lastToken = undefined;
		}
	}

	class Nodes extends Node {
		/** @param {string} [nodeType] */
		constructor(nodeType) {
			super(nodeType);
			/** @type {Node} */
			this.firstNode = this.lastNode = undefined;
			/** @type {Token} */
			this.firstTokenNode = this.lastTokenNode = undefined;
			/** @type {TokenizerToken} */
			this.firstToken = this.lastToken = undefined;
		}

		/**
		 * @template {Node} T
		 * @param {T} child
		 * @returns T
		 */
		appendChild(child) {
			child.previousNode = this.lastNode;
			this.children === undefined
				? (this.children = [(this.firstNode = child)])
				: push(this.children, (this.lastNode.nextNode = child));
			(child.rootNode = (child.parentNode = this).rootNode).nodeCount++;
			child.previousTokenNode = this.lastTokenNode;
			return (this.lastNode = child);
		}

		/**
		 * @param {TokenizerToken} token
		 * @param {string} [type]
		 */
		appendToken(token, type) {
			const {lastTokenNode, lastNode} = this;
			const child = this.appendChild(new Token(token, type));
			(child.previousTokenNode = lastTokenNode) === undefined
				? ((this.firstToken = token), (this.firstTokenNode = child))
				: (child.previousTokenNode.nextTokenNode = child);
			if (lastTokenNode !== undefined && lastTokenNode !== lastNode) {
				/** @type {Node} */
				let node = this.lastTokenNode;
				while ((node = node.nextNode) !== lastNode) node.nextTokenNode = child;
				node.nextTokenNode = child;
			}
			this.lastToken = token;
			this.lastTokenNode = child;
			return child;
		}

		/**
		 * @param {string} text
		 * @param {string} type
		 */
		appendText(text, type) {
			const child = this.appendChild(new Text(text, type));
			return child;
		}
	}

	class Root extends Nodes {
		/** @param {string} [nodeType] */
		constructor(nodeType) {
			super(nodeType);
			this.rootNode = this;
			this.nodeCount = 0;
			/** @type {Construct[]} */
			this.constructs = [];
		}
	}

	class Closure extends Nodes {}
	class Template extends Nodes {}

	class Construct extends Nodes {}

	Object.defineProperty(Construct, 'currentConstruct', {value: symbols.CurrentConstruct, writable: false});

	return {Node, Root, Construct, Closure, Template, Text, Source, Binding};
})();
