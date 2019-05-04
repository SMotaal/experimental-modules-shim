# Modules › Shim <nav float-right>[<kbd>GitHub</kbd>](https://github.com/SMotaal/experimental-modules-shim)

Runtime-strapped Module subsystem.

## Demonstration

### Browser

- [ESM sources](./modules.html?dev)

- [ESM bundle](./modules.html)

### Node.js

<table>

- ESM sources

  `node --experimental-modules ./esm.mjs --dev`

- ESM bundle

  `node --experimental-modules ./esm.mjs`

- CJS Bundle

  `node ./cjs`

## Known Limitations

Shimming the behaviours of ECMAScript module code is not trivial, and likely not attainable with 100% accuracy where it is not already supported.

This experimental model follows the path of least resistance when it comes to preserving semantics using an approach similar to that used by the Realms shim.

**Live Bindings**

The specific live binding behaviour whereby imported binding declarations which are mutable on the exporting side must be readonly on the importing side — ECMAScript does not provide a declaration capable of being both a constant within its scope and mutable elsewhere.

This can be solved by introducing a new `bind` modifier that can appear inside a **strict-mode** function block.

The binding would result in a lexically scoped declaration of the bind name, making it illegal to redeclare or modify the respective binding identifier identical to those presented by a `const` declaration in the same position.

This would immediately result in the desired behaviour of top-level module code executing at the function body level. However, some modifications to the direct `eval` specification will be needed to afford additional shimming optimizations.
