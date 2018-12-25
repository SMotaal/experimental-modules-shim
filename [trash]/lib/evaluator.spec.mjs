import {createEvaluator} from './evaluator.mjs';

const test = () =>
  console.log(
    createEvaluator((module, exports) => {
      `export { q, TWO, y, g1, G1 }`;
      const defaults = new class Defaults {}();
      var q;
      const TWO = 2;
      let {y = {}} = defaults;
      function g1() {}
      class G1 {}
      exports.default(defaults);
    }),
  );
