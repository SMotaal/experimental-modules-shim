# ESX

## Experimental

At the moment, ES Modules do not directly include fallback support for legacy runtimes. The only solutions to date are AOT transpilation with platform mechanisms like `nomodule` and even then, many simply avoid ES modules.

A different alternative is proposed which can minimize the gap between ES Module source text and the code evaluated within environments that do not support. It tries to mitigate the performance burden of eager AOT transpilation by using a JIT transpiler that targets a new module subsystem.

### Framework

#### Evaluator

A number of designs are explored to select an evaluator that provide the best balance between interoperability, performance, and spec compliance.

```js
Evaluator: ((module, exports) => {
  with (module.scope)
    (async function() {
      'use strict';
      await exports(() => q, () => TWO, () => y, () => g1, () => g2, () => g3, () => G1);

      const defaults = new class Defaults {}();
      var q;
      const TWO = 2;
      let {y = {}} = defaults;
      function g1() {}
      async function g2() {}
      function* g3() {}
      class G1 {}
      exports.default = defaults;
    })();
})(context, context.exports);
```

Which pairs with the following context:

```ts
interface ModuleContext {
  scope: Proxy<Object>;
  meta: Object;
  exports(...bindings): Promise<void>;
  exports: {
    set default(): void;
  };
}
```

**Caveats**

- Either:
  - `this` references cannot be coerced to undefined.
  - `arguments` is accessible in module

### Translation

Translating the behaviour of `import` and `export` of the ECMAScript module syntaxes is a lot more complicated because they operate by exposing binding references and not actual values, with two exception.

#### Default Exports

```js
// Computed Value (ie exports.default = ⚛️)
export default ⚛️
```

The first exception is `export default …` since it exports the value itself, so importing modules using the `import 🆔 from …` syntax must wait until the exporter executes and resolved the value of this immutable binding before they can begin to execute.

#### Namespace Exports

```js
import * as 🆔 from …
```

The second exception is namespace imports, because they receive an object, which destructures like any normal object, that is destructured variables get populated with the actual values at the time of exeuction and do not retain any bindings to the original variable in the exporting module's scope. However, also like any other object which uses getters, direct access to it's fields including subsequent destructuring will yield continue to the real-time value from the exporting module's scope.

#### Binding Exports

For all other exports, importing modules create one-way real-time bindings into the exporter's scope, irrespective of any semantics inculding mutability or hoistability. Which is the simplified gist of the painful narrative disclosed in the actual specification which aggregates this abstractional behaviour together with a explicit mirroring of the original semantics of the declarations themselves, with the odd potential for edge cases.

#### Implementation Trade-offs

From an implementation perspective, the semantics of declarations afford various degrees of optimizations.

Constants for instance do not require true getters, they can be set to undefined and overwritten once they become defined.

#### Parsing Trade-offs

From a parsing perspective, syntaxes also come with trade-offs. The cost of parsing destructuring expressions is much higher than that of a referenced or aliased mapping (ie `export {a, b as c}`).

```js
// Declarative Binding (ie define(exports, '🆔', {get: () => 🆔, set:  ⚛️ => exports.🆔 =  ⚛️ })
export const 🆔, 🆔 = ⋯, 🆔
export const 🆔, 🆔 = ⋯, 🆔
export const 🆔 = ⋯
export const {🆔 = ⋯, 🆔: {🆔 = ⋯, 🆔} = ⋯} = ⋯
export const [🆔 = ⋯, 🆔: {🆔 = ⋯, 🆔} = ⋯] = ⋯

// Declarative Variable Binding (ie define(exports, '🆔', {get: () => 🆔} })
export let 🆔, 🆔 = ⋯, 🆔
export let 🆔, 🆔 = ⋯, 🆔
export let 🆔 = ⋯
export let {🆔 = ⋯, 🆔: {🆔 = ⋯, 🆔} = ⋯} = ⋯
export let [🆔 = ⋯, 🆔: {🆔 = ⋯, 🆔} = ⋯] = ⋯
export var 🆔, 🆔 = ⋯, 🆔
export var 🆔, 🆔 = ⋯, 🆔
export var 🆔 = ⋯
export var {🆔 = ⋯, 🆔: {🆔 = ⋯, 🆔} = ⋯} = ⋯
export var [🆔 = ⋯, 🆔: {🆔 = ⋯, 🆔} = ⋯] = ⋯

// Declarative Hoistable Variable Binding (ie define(exports, '🆔', {get: () => 🆔} })
export async function* 🆔 ⋯(){}
export function* 🆔 ⋯(){}
export async function 🆔 ⋯(){}
export function 🆔 ⋯(){}
export class 🆔 ⋯ {}

// Referential Bindings (ie define(exports, '🆎', {get: () => 🆔} })
export {🆔, 🆔 as 🆎}
```
