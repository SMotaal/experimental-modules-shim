//@ts-check
/// <reference path="./types.d.ts"

import * as symbols from './symbols.js';

export const {Node, Root, Construct, Closure, Template, Text, Token} = (() => {
	const push = Function.call.bind(Array.prototype.push);

	/** @type {boolean} */
	const RETAIN_TOKEN_CONTEXTS = false;

	class Node {
		/** @param {string} [nodeType] */
		constructor(nodeType) {
			this.nodeType = nodeType;

			this[Symbol.toStringTag] = nodeType == null ? new.target.name : `${new.target.name} ⟨${nodeType}⟩`;

			if (new.target.RETAIN_TOKEN_CONTEXTS === true)
				/** @type {TokenizerContext} */
				this.context = undefined;

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
			this.token = this.firstToken = this.lastToken = undefined;

			/** @type {TokenizerToken} */
			this[symbols.LastKeyword] = this[symbols.LastOperator] = this[symbols.LastBreak] = undefined;

			/** @type {string} */
			this.text = undefined;

			/** @type {string} */
			this[symbols.Construct] = undefined;
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

	Object.setPrototypeOf(Token.prototype, null);

	class Text extends Node {
		/** @param {string} text @param {string} nodeType */
		constructor(text, nodeType) {
			super(nodeType);
			this.text = text;
		}
	}

	Object.setPrototypeOf(Text.prototype, null);

	class Parent extends Node {
		set lastToken(lastToken) {}

		get lastToken() {
			return this.lastTokenNode && this.lastTokenNode.lastToken;
		}

		set firstToken(firstToken) {}

		get firstToken() {
			return this.firstTokenNode && this.firstTokenNode.firstToken;
		}

		set text(text) {
			// Object.defineProperty(this, 'text', {value: text, writable: true, enumerable: true});
		}

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
				: push(this.children, (this.lastNode[Node.nextNode] = child));
			(child[Node.rootNode] = (child[Node.parentNode] = this)[Node.rootNode]).nodeCount++;
			child[Node.previousTokenNode] = this.lastTokenNode;

			return (this.lastNode = child);
		}

		/** @param {ParentNode|TokenNode} child */
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

		/**
		 * @param {string} text
		 * @param {string} type
		 */
		appendText(text, type) {
			const child = this.appendChild(new Text(text, type));
			return child;
		}
	}

	Object.setPrototypeOf(Parent.prototype, null);

	class Root extends Parent {
		/** @param {string} [nodeType] */
		constructor(nodeType) {
			super(nodeType);
			this[Node.rootNode] = this;
			/** @type {ConstructNode[]} */
			this.constructs = [];

			// Only unique property
			this.nodeCount = 0;
		}
	}

	class Closure extends Parent {}
	class Template extends Parent {}

	class Construct extends Parent {}

	{
		const descriptors = Object.getOwnPropertyDescriptors(Parent.prototype);
		delete descriptors.constructor;
		for (const Nodes of [Root, Closure, Template, Construct]) {
			Object.setPrototypeOf(Object.defineProperties(Nodes.prototype, descriptors), null);
		}

		Object.defineProperty(Node, 'rootNode', {value: symbols.RootNode, writable: false});
		Object.defineProperty(Node, 'parentNode', {value: symbols.ParentNode, writable: false});
		Object.defineProperty(Node, 'nextNode', {value: symbols.NextNode, writable: false});
		Object.defineProperty(Node, 'previousNode', {value: symbols.PreviousNode, writable: false});
		Object.defineProperty(Node, 'nextTokenNode', {value: symbols.NextTokenNode, writable: false});
		Object.defineProperty(Node, 'previousTokenNode', {value: symbols.PreviousTokenNode, writable: false});
		Object.defineProperty(Node, 'construct', {value: symbols.Construct, writable: false});
		Object.defineProperty(Node, 'trailer', {value: symbols.Trailer, writable: false});
		Object.defineProperty(Node, 'lastKeyword', {value: symbols.LastKeyword, writable: false});
		Object.defineProperty(Node, 'lastOperator', {value: symbols.LastOperator, writable: false});
		Object.defineProperty(Node, 'lastBreak', {value: symbols.LastBreak, writable: false});

		Object.freeze(Node);
	}

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
