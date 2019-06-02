//@ts-check
/// <reference path="./types.d.ts" />

import * as symbols from './symbols.js';

export const {Node, Root, Construct, Closure, Template, Text, Token} = (() => {
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
	class Construct extends Parent {}

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
