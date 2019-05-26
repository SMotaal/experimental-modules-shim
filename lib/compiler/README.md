# Module › Compiler

Runtime compilation of ECMAScript code is very different from conventional parsing done by tooling. Depending on how you decide to go about it, there will always be trade-offs that relate to verbosity, safety, performance, and portability.

The givens of parsing at runtime are matter-of-fact knowledge of the target and everything that entails, with two exceptions where out-of-band factors influence the <kbd>strict</kbd> or <kbd>module</kbd> parameters for parsing.

This work proposes a two-tiered ["contemplative" parsing](../../documentation/Contemplative-Parsing.md) approach to safely synthesize runtime behaviours in ways that would potentially eliminate such unknowns.

## Module Parsing

Module parsing can become very taxing at runtime when it fails to optimize to the bare necessities. For that reason, the ECMAScript specification made clear distinctions for early errors and positions for static and dynamic dependency declarations.

Shimming requirements differ slightly from that of native implementations because they operate within the execution context itself and must introspectively avert deadlocks or blocking pitfalls:

- Static linking errors should always terminate all graph operations in the following expectations:

  1. No code execution should not have started.
  2. No deep parsing should have started.
  3. Termination steps should proceed in the following order:

     1. All parsing must abort.
     2. All loading must abort.
     3. A single exception must be thrown.

- Dynamic linking errors should only throw during executing with the following instrumentation requirements:

3. Syntax errors require finer-grained rules:

### Root Parse

```
Namespace Identifiers ≡ {
    … Internalized Identifiers
    … Externalized Identifiers
  } Where,
      Internalized Identifiers ∩ Externalized Identifiers ⊇ ∅

Internalized Identifiers ≡ {
    … Imported Declarations
    … Exported Declarations
    … Isolated Declarations
  } Where,
      Imported Declarations ∩ Exported Declarations ≡ ∅
      Exported Declarations ∩ Isolated Declarations ≡ ∅
      Isolated Declarations ∩ Imported Declarations ≡ ∅

Externalized Identifiers ≡ {
    … Exported Declarations
    … Exported References
    … Symbolic Exports
  } Where,
      Exported Declarations ∩ Exported References ≡ ∅
      Exported References ∩ Symbolic Exports ≡ ∅
      Symbolic Exports ∩ Exported Declarations ≡ ∅
```

### Deep Parse

### Instrumenting `import(…)` expressions

```
When:

  - All ‹import›≈‹(› positions in source text(s) are identified
  - All static linking must successfully concludes

Where:

  - ‹import› keyword reflects the builtin handler
  - $resolve$ synchronously mutates ‹[…]›
  - $scope$ include module records
  - $realm$ include module mapping records
  - $import$ loads recoverably behind a promise

Expression:

  〖 ‹import› ‹(›           ‹[…]›             ‹)› 〗

Substitution:

  Module code including direct evaluation:

  〖 $import$ ‹(› $resolve$(‹[…]›, $realm$, $scope$) ‹)› 〗

  Global code including indirect evaluation:

  〖 $import$ ‹(› $resolve$(‹[…]›, $realm$, $scope$) ‹)› 〗

```

### Instrumenting `eval(…)` expressions

```
When:

  - All ‹eval› positions in source text(s) are identified
  - All static linking must successfully concludes
  - All shadowed ‹eval› positions are excluded
  - All referenced ‹eval› aliase positions are identified
  - All non-call positions are excluded

Where:

  - ‹eval› identifier reflects the builtin eval handler
  - $scrub$ synchronously instruments ‹[…]›
  - $scope$ include module records
  - $realm$ include module mapping records

Expression:

  〖 ‹eval› ‹(›         ‹[…]›                    ‹)› 〗

Substitution:

  Module code including direct evaluation:

  〖 ‹eval› ‹(› $scrub$(‹[…]›, $realm$, $scope$) ‹)› 〗

  Global code including indirect evaluation:

  〖 ‹eval› ‹(› $scrub$(‹[…]›, $realm$)          ‹)› 〗

Expression:

  〖 [(,] ‹eval› ‹)› ‹(›         ‹[…]›           ‹)› 〗

Substitution:

  〖 [(,] ‹eval› ‹)› ‹(› $scrub$(‹[…]›, $realm$) ‹)› 〗
```

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
