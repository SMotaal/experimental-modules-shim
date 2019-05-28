//@ts-check
/// <reference path="./types.d.js"

import * as symbols from './symbols.js';

export const {Node, Root, Construct, Closure, Template, Text, Token, Source, Binding} = (() => {
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

			this[Symbol.toStringTag] = nodeType == null ? new.target.name : `${new.target.name} ⟨${nodeType}⟩`;

			if (new.target.RETAIN_TOKEN_CONTEXTS === true)
				/** @type {TokenizerContext} */
				this.context = undefined;

			/** @type {Root} */
			this.rootNode = undefined;

			/** @type {Node} */
			this.parentNode = this.previousNode = this.nextNode = undefined;
			/** @type {Token | Nodes} */
			this.previousTokenNode = this.nextTokenNode = undefined;

			/** @type {Node[]} */
			this.children = undefined;
			/** @type {Node} */
			this.firstNode = this.lastNode = undefined;
			/** @type {Token} */
			this.firstTokenNode = this.lastTokenNode = undefined;
			/** @type {TokenizerToken} */
			this.token = this.firstToken = this.lastToken = undefined;
			/** @type {TokenizerToken} */
			this.lastKeyword = this.lastOperator = this.lastBreak = undefined;

			/** @type {string} */
			this.text = undefined;

			/** @type {string} */
			this[symbols.CurrentConstruct] = undefined;
			/** @type {Construct[]} */
			this.constructs = undefined;
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
		}
	}

	class Nodes extends Node {
		set lastToken(lastToken) {}

		get lastToken() {
			return this.lastTokenNode && this.lastTokenNode.lastToken;
		}

		set firstToken(firstToken) {}

		get firstToken() {
			return this.firstTokenNode && this.firstTokenNode.firstToken;
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

		/** @param {Nodes | Token} child */
		appendToken(child) {
			const {lastTokenNode, lastNode} = this;
			this.appendChild(child);
			(child.previousTokenNode = lastTokenNode) === undefined
				? (child.firstToken && (this.firstToken = child.token), (this.firstTokenNode = child))
				: (child.previousTokenNode.nextTokenNode = child);
			if (lastTokenNode !== undefined && lastTokenNode !== lastNode) {
				/** @type {Node} */
				let node = this.lastTokenNode;
				while ((node = node.nextNode) !== lastNode) node.nextTokenNode = child;
				node.nextTokenNode = child;
			}
			child.lastToken && (this.lastToken = child.lastToken);
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
			/** @type {Construct[]} */
			this.constructs = [];

			// Only unique property
			this.nodeCount = 0;
		}
	}

	class Closure extends Nodes {}
	class Template extends Nodes {}
	class Construct extends Nodes {}

	Object.defineProperty(Construct, 'currentConstruct', {value: symbols.CurrentConstruct, writable: false});

	return {Node, Root, Construct, Closure, Template, Text, Token, Source, Binding};
})();
