import {a as a2, b as b2, c as c2} from './circular-imports-2.mjs';
export let a, b, c;

const n = typeof a1 === 'string' ? 2 : 1;
a = (() => n === 1 ? 'a1' : `${a1} a2`)();
b = (() => n === 1 ? `${a2} b1` : `${b1} b2`)();
c = (() => n === 1 ? `${b2} c1` : `${c1} c2`)();

export default {a, b, c};
