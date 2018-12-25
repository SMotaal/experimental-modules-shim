import {a as a1, b as b1, c as c1} from './circular-imports-1.mjs';
export {a, b, c} from './circular-imports-1.mjs';
// export let a, b, c;

// const n = typeof a1 === 'string' ? 2 : 1;
// a = (() => n === 1 ? 'a1' : `${a1} a2`)();
// b = (() => n === 1 ? `${a2} b1` : `${b1} b2`)();
// c = (() => n === 1 ? `${b2} c1` : `${c1} c2`)();

export default {a, b, c};
