export const Token = class Token {};
export const Unknown = class Unknown extends Token {};
export const Atom = class Atom extends Token {};

Object.setPrototypeOf(Token.prototype, null);
Object.setPrototypeOf(Atom.prototype, null);
Object.setPrototypeOf(Unknown.prototype, null);

export const Node = (() => {
	const push = Function.call.bind(Array.prototype.push);

	/** @extends {ArrayLike<Token | Node | Text>} */
	class Node extends Array {
		/**
		 * @param {tokenizer.Context} context
		 * @param {Node} [parentNode]
		 * @param {number} [number]
		 */
		constructor(context, parentNode, number) {
			super();
			number >= 0 && (this.number = number);
			this.context = context;
			/** @type {Token | Node | Text} */
			this.previousNode = this.nextNode = this.firstNode = this.lastNode = undefined;
			/** @type {Token} */
			this.firstToken = this.lastToken = undefined;
			(this.parentNode = parentNode || undefined) && parentNode.appendChild(this);
		}

		/** @param {Token | Node | Text} child */
		appendChild(child) {
			(child.previousNode = this[push((child.parentNode = this), (this.lastNode = child)) - 2])
				? (child.previousNode.nextNode = child)
				: (this.firstNode = child);
			return child;
		}

		/**
		 * @param {string} text
		 * @param {string} [type]
		 * @param {typeof Token} [Species]
		 */
		appendText(text, type, Species) {
			return this.appendChild(new (Species || Text)(text, type));
		}

		/**
		 * @param {Token} token
		 * @param {typeof Token} [Species]
		 */
		appendToken(token, Species) {
			if (this.appendChild(token) === token) {
				Object.setPrototypeOf(token, (Species = Species || Unknown).prototype);

				token[Symbol.toStringTag] = `${Species.name} ‹${token.type}›`;

				(token.previousToken = this.lastToken) && (token.previousToken.nextToken = token);
				this.lastToken = token;
				this.firstToken === undefined && (this.firstToken = token);
			}
			return token;
		}
	}

	Object.defineProperties(Object.setPrototypeOf(Node.prototype, null), {
		[Symbol.iterator]: Object.getOwnPropertyDescriptor(Array.prototype, Symbol.iterator),
	});

	return Node;
})();

// const BlockClosure = class BlockClosure extends Node {};
export const Root = class Root extends Node {};
export const Closure = class Closure extends Node {};

export const Text = class Text extends String {
	/** @param {string} text @param {string} [type] */
	constructor(text, type) {
		super(text);
		this.text = this;
		this[Symbol.toStringTag] = `${new.target.name || text} ‹${(this.type = type || 'unknown')}›`;
	}
};

export const Literal = class Literal extends Text {
	/** @param {string} text @param {string} [type] */
	constructor(text, type) {
		super(text, type || 'literal');
	}
};

export const Operator = class Operator extends Text {
	/** @param {string} text @param {string} [type] */
	constructor(text, type) {
		super(text, type || 'operator');
	}
};

export const Punctuator = class Punctuator extends Text {
	/** @param {string} text @param {string} [type] */
	constructor(text, type) {
		super(text, type || 'punctuator');
	}
};

export const Comment = class Comment extends Text {
	/** @param {string} text @param {string} [type] */
	constructor(text, type) {
		super(text, type || 'comment');
		this.isComment = true;
	}
};

export const Whitespace = class Whitespace extends Text {
	/** @param {string} text @param {string} [type] */
	constructor(text, type) {
		super(text, type || 'whitespace');
		this.isWhitespace = true;
	}
};

export const Identifier = class Identifier extends Text {
	/** @param {string} text @param {string} [type] */
	constructor(text, type) {
		super(text, type || 'identifier');
		this.isIdentifier = true;
	}
};

export const Keyword = class Keyword extends Text {
	/** @param {string} text @param {string} [type] */
	constructor(text, type) {
		super(text, type || 'keyword');
		this.isKeyword = true;
	}
};
