// import {all} from '../../markup/lib/markup-patterns.mjs';

const raw = String.raw;
const all = (...patterns) => patterns.map(p => (p && p.exec ? p.source : p)).join('|');
const expressions = {
  Quotes: /`|"(?:[^\\"]+|\\.)*(?:"|$)|'(?:[^\\']+|\\.)*(?:'|$)/g,
  Comments: /\/\/.*(?:\n|$)|\/\*[^]*?(?:\*\/|$)|^\#\!.*\n/g,
  RegExps: /\/(?=[^\*\/\n][^\n]*\/)(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/[a-z]*/g,
  Bindings: /\b(import|export)\b +(?:{ *([^}]*?) *}|([*] +as +\S+|\S+)|)(?: +from\b|)(?: +(['"])(.*?)\4|(?:const|let|var) +(?:{ *([^}]*?) *}|\S+)|)/g,
};
const matchers = {};

{
  const {Quotes, Comments, RegExps, Bindings} = expressions;
  const ESM = all(Quotes, RegExps, Comments, Bindings);
  matchers.esm = new RegExp(ESM, 'g');
}

export {expressions, matchers};
