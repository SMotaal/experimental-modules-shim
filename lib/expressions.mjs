/// ECMAScript Expressions

/** ECMAScript quoted strings: `'…'` or `"…"`  */
export const StringLiteral = /"(?:[^\\"]+|\\.)*(?:"|$)|'(?:[^\\']+|\\.)*(?:'|$)/g;

/** ECMAScript comments */
export const Comments = /\/\/.*(?:\n|$)|\/\*[^]*?(?:\*\/|$)|^\#\!.*\n/g;

/** ECMAScript regular expressions  */
export const RegExps = /\/(?=[^\*\/\n][^\n]*\/)(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/[a-z]*/g;

/// Custom Expressions

/** Comma with surrounding whitespace */
export const Separator = /[\s\n]*,[\s\n]*/;

/** Mapped binding: `Identifier as BindingIdentifier` */
export const Mappings = /([^\s,]+)(?: +as +([^\s,]+))?/g;

/** Quoted export mappings: `export {…}` */
export const Exports = /`export *{([^}`;\*]*)}`/gm;

/** Nothing but Identifier Characters */
export const Identifier = /[^\n\s\(\)\{\}\-=+*/%`"'~!&.:^<>,]+/;

export const Bindings = /\b(import|export)\b +(?:{ *([^}]*?) *}|([*] +as +\S+|\S+)|)(?: +from\b|)(?: +(['"])(.*?)\4|(?:const|let|var) +(?:{ *([^}]*?) *}|\S+)|)/g;

export const BindingDeclarations = /\b(import|export)\b +(?:{ *([^}]*?) *}|([*] +as +\S+|\S+)|)(?: +from\b|)(?: +(['"])(.*?)\4|)/g;

export const Specifier = /^(?:([a-z]+[^/]*?:)\/{0,2}(\b[^/]+\/?)?)(\.{0,2}\/)?([^#?]*?)(\?[^#]*?)?(#.*?)?$/u;

Specifier.parse = specifier => {
  const [url, schema, domain, root, path, query, fragment] = Specifier.exec(specifier) || '';
  return {url, schema, domain, root, path, query, fragment, specifier};
};
