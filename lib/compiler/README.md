# Module › Compiler

Runtime compilation of ECMAScript code is very different from conventional parsing done by tooling. Depending on how you decide to go about it, there will always be trade-offs that relate to verbosity, safety, performance, and portability.

The givens of parsing at runtime are matter-of-fact knowledge of the target and everything that entails, with two exceptions where out-of-band factors influence the <kbd>strict</kbd> or <kbd>module</kbd> parameters for parsing.

This work proposes a two-tiered ["contemplative" parsing](../../documentation/Contemplative-Parsing.md) approach to safely synthesize runtime behaviours in ways that would potentially eliminate such unknowns.

## Module Syntax

In order to accommodate module code where it would normally be restricted by the ECMAScript grammar, we must rely on otherwise valid syntax that would retain the semantics while making it impossible for the code to partially execute if invoked accidentally or prematurely.

**Supported Module Syntax**

- [ ] Top-level import bindings (planned)
- [ ] Top-level await evaluation (planned)
- Top-level await export (tentative)

**Transitive Module Syntax**

> **Note**: Transitive modules can be exposed in ways where the potential for accidental or premature invocation mandates safe-guarding.

```js
// prettier-ignore
module =>
	void (() => {
    module.import`a from 'a'`; // bind a
    module.import`b from 'b'`; // bind b

    const promise = new Promise(resolve => resolve(1));

    let value = module.await(promise); // await/export

		console.log('done');

    module.export.default = value;

    module.await(Promise.resolve()); // await/evaluation

    module.export`{ value, promise as resolved }`;
	});
```

**Compiled Module Syntax**

> **Note**: Compiled modules are handled internally which eliminates external potential for accidental or premature invocation, as such traceability is top priority.

```js
// prettier-ignore
(module, exports) => {
  exports(() => value, resolved => promise);

  // module.import`a from 'a'`; // bind a
  // module.import`b from 'b'`; // bind b

  const promise = new Promise(resolve => resolve(1));

  let value; // TDZ

  exports.default = // declared only TDZ
  module.await(async () => {
    value = await (promise); // await/export

    console.log('done');

    exports.default = value; // exposed

    await (Promise.resolve());  // await/evaluation
	});
};
```
