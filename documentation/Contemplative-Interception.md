# Contemplative Parsing › Interception

This section deals with the first tier of [contemplative parsing](./Contemplative-Parsing.md) and is followed by [rewriting](./Contemplative-Rewriting.md).

## ECMAScript Modules

> **Important Note**: Initial efforts focus exclusively on ECMAScript module code — [details](./Contemplative-Parsing.md#ecmascript-modules)

### Intercepting Static `import` Statements

Contemplative parsing guarantees can be made about any occurrences of `import` which must occur top-level being attributed to the respective module.

This can be summarized with the following minimal input:

```js
import 'specifier';
import * as namespace from 'specifier';
```

### Intercepting Dynamic `import` Statements

TBD.

### Intercepting `eval` Statements

Contemplative parsing guarantees can be made about any occurrences of `eval` and dynamic `import(…)` being attributed to the parent `{…}` closure — with the one exception where such a closure is a literal or destructuring construct in which attribution traverses to the closest qualifying `{…}` closure.

This can be summarized with the following minimal input:

```js
{
  console.log({
    direct: eval('this'),
    indirect: (1, eval)('this')),
    promise: import('specifier'),
  });
}
```

### Intercepting `new Function` Statements

TBD.
