# Contemplative Parsing

The approach explored described here is part of a two-tiered parse-based approach to synthesize runtime behaviours through iterative [_interception_](./Contemplative-Interception.md) and [_rewriting_](./Contemplative-Rewriting.md) of evaluated code.

## ECMAScript Modules

Initial efforts focus exclusively on ECMAScript module code, where the efficacy and validity of such mechanics that tailor to specifics of the ECMAScript grammar correlate with the ability to intercept affected code before it is evaluated without explicit guarantees that other code evaluated at runtime will be intercepted, accommodated or detected by this system.

### Interception

Contemplative parsing include the following intercepts:

1. [Intercepting static module imports — ie `import …` and `import … from '…'`](./Contemplative-Interception.md#intercepting-static-import-statements)

2. [Intercepting dynamic module imports — ie `import(…)`](./Contemplative-Interception.md#intercepting-dynamic-import-statements)

3. [Intercepting dynamic code evaluation — ie `eval(…)`](./Contemplative-Interception.md#intercepting-eval-statements)

4. [Intercepting dynamic function construction — ie `new Function(…)`](./Contemplative-Interception.md#intercepting-new-function-statements)

### Rewriting

Iterative rewriting includes the following considerations:

1. Interception must take place prior to module loading (ie service-worker or loader).
2. Specifier rewrites should synchronize with context/realm module records.
3. Restrictions must irrecoverably throw.
