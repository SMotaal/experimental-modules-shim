export default  (typeof self === 'object' && self && self.self) ||
(typeof global === 'object' && global && global.global) ||
(() => (1, eval)('this'))();
