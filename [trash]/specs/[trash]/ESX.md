# ESX

Lightweight ECMAScript module backporting with minimal rewrite.

## Scope

ESX is a module format inspired by ECMAScript module syntaxes which can execute in runtimes that do not support ESM out of the box. The unique thing about ESX is that it aims to use very similar syntaxes as ESM, to a degree that balances code clarity with reliability and performance. The aim is to keep the process fast and minimal to the point that it can be used just-in-time and compare to existing precompiled or bundled workflows.

While most other JavaScript module formats were designed prior to modules being standardized by ECMAScript, ESX comes later and only focuses on aspects of parity. So it is not a promise of things yet to come and claim that they will, if they ever do. ESX is the opposite of this bag of tricks. It merely looks at retroactively solving compatibility gaps that will allow ESM code to quickly translate to unsupporting runtimes.

## Runtime Semantics

### ESX `module.context`

```ts
interface Module {
  context(...names): ModuleContext;
}

interface ModuleContext {
  exports(...args): void;
  // imports(...args): void;
}
```

#### Top-Level Declarations

```js
ESM: {
  /* ECMAScript Module Context */

  /* Top-level Variables */
  var p;
  const ONE = 1;
  let {x = {}} = defaults;

  /* Top-level Functions and Classes */
  function f1() {}
  async function f2() {}
  async function* f3() {}
  class F1 {}
}

ESX: with (module.context()) {
  /* ECMAScript Object Context */

  /* Top-Level Variables */
  let p; // prevents leaked contamination
  const ONE = 1; // locally scoped as intended
  let {x = {}} = defaults; // locally scoped as intended

  /* Top-level Functions and Classes */
  function f1() {} // hoists as exected
  async function f2() {} // hoists as exected
  async function* f3() {} // hoists as exected
  class F1 {} // does not hoist as exected
}
```

_Runtime Execution_

_Context Creation_

1. `module.context` called with no exported names
2. `module.context` asserts context has not already been created
3. `module.context` creates a one-time context
4. `module.context` creates a one-time exports interface
5. `module.context` freezes it's exports interface
6. `module.context` returns a one-time "bare" proxy object

_Compliance Notes_

- Throws on assigning to out of scope names **Simulated**
- Allows access to globally scoped names **Simulated**

#### Exported Declarations

_Top-Level Variables_

```js
ESM: {
  /* ECMAScript Module Context */

  /* Exported Top-level Variables */
  export var q;
  export const TWO = 2;
  export let {y = {}} = defaults;
  export default defaults;

  /* Exported Top-level Functions and Classes */
  export function g1() {}
  export async function g2() {}
  export async function* g3() {}
  export class G1 {}
}

ESX: with (module.context('q', 'TWO', 'y', 'default', 'g1', 'g2', 'g3', 'G1')) {
  /* ECMAScript Object Context */

  /* Exported Top-level Variables */
  exports(`var`)(q); //                     mutable exports when expected
  // OR: exports.var(q);
  exports(`const`)((TWO = 2)); //           immutable exports when expected
  // OR: exports.const((TWO = 2));
  exports(`let`)(({y = {}} = defaults)); // mutable exports when expected
  // OR: exports.let(({y = {}} = defaults));
  exports(`default`)(defaults); //          default exports when expected
  // OR: exports.default(defaults);

  /* Exported Top-level Functions and Classes */
  function g1() {} // hoists expected
  exports(() => g1); // exports when expected
  async function g2() {} // hoists expected
  exports(() => g2); // exports when expected
  async function* g3() {} // hoists expected
  exports(() => g3); // exports when expected
  class G1 {} // does not hoist expected
  exports(() => G1); // exports when expected
}
```

**Functions and Classes**

_Runtime Execution_

Context Creation:

- `module.context` called with exported names:

  1. `module` asserts context has not already been created
  2. `module` creates a one-time context
  3. `module` creates a one-time exports interface
  4. `module` ensures the private bindings object is created
  5. `module` defines "exportable" fields onto private bindings object
  6. `module` defines getters for bindings fields on exports object
  7. `module` freezes it's exports interface
  8. `module` returns a one-time "bound" proxy object against bindings

Module Evaluation:

> WHEN `context.exports` is called:
>
> > `context` checks typeof `arguments`
>
> IF typeof `arguments` is `['var'|'const'|'let'|'default']` THEN
>
> > 1. `context` switches to the respective binding mode
> > 2. `context` returns a binding callback
> > 3. AssignmentExpression evaluate passed to binding callback
> > 4. `context` switches out of binding mode
> > 5. `context` redefines "exported" fields onto private bindings object
>
> IF typeof `arguments` is `[() => Function & { name: string }]` THEN
>
> > 1. `context` evaluates `getter` to determine `defined` name
> > 2. `context` exposes `defined` property to consumers
>
> ELSE
>
> > Throw `Eval Error` pointing to export location in source text
>
> FINALLY
>
> > `context` signals and yields for importing consumer side-effects

_Compliance Notes_

- FunctionDeclaration scoped to `context` **Compliant**
- Throws on assigning to out of scope names **Simulated**
- Allows access to globally scoped names **Simulated**
- VaribleDeclaration initializations are never hoistable. **Compliant**
- AssignmentExpressions is the lowest common denominator. **Compliant**
- Consumers execute outwards per dependency order. **Compliant**
