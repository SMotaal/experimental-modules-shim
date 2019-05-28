# Contemplative Parsing

## Constructs

> To know enough about the meaningful framing of any grammar production permutations that unambiguously determine some intent, makes it so that we can address or influence their effect without having to know precisely how it all fits in the larger scheme of the text in which they occur.

We're talk parsing constructs, which are sequences of productions that are meaningful because they follow oneanother and in which there is at least one unambiguous grammar feature, ie keyword, punctuator… etc.

What sets constructs apart from the usual aggregates — like ones in the ECMAScript spec — is:

1. they do not rely on the syntax validity of _all_ previous text
2. they do not determine intent with absolute certainty

In contrast they rely on meaningfully framing of productions to identify and operate on strings of text of an unambiguous intent.

This is can be demonstated as follows:

```
1. Starting with any invariant grammar production:

   • ‹export›

2. In absolute vaccum, it denotes nothing beyond its form:

   • Latin sequence — "e" "x" "p" "o" "r" "t"

3. In a meaningful frame, it distinguishes from other identical forms:

   • Module code — syntactic frame (goal)
   • Word boundary — addressability frame (token)
   • Keyword — operative frame (role)

4. Followed by another, it constructively attributes some intent:

   • ‹export›~‹default›
   • ‹export›~‹const›

5. Followed by anything else, the intent is unambiguous:

   • ‹export›~‹const› ¬ ‹a›
   • ‹export›~‹const› ¬ ‹{›
```

A differentiating aspect of constructs is that they neither contribute to or rely upon the syntax validity of the complete text. Because of that they offer latitude and flexibility with the assumption that an incomplete construct has no direct correlation with a syntax error thrown at runtime.

For instance:

```js
export * as components from 'components';
```

While the above is not standard ECMAScript syntax, it contains valid constructs each with unambiguous intents based on sound permutations of productions of the ECMAScript grammar:

<table width:=fill-available margin:=0>

<tr><td>

```
‹export›
```

<td>

declare an export binding

<tr><td>

```
‹*›~‹as›~‹Identifier›
```

<td>

binding a namespace entity to a specific identifier

<tr><td>

```
‹from›~‹String›
```

<td>

make references against a specific module

</table>

If you operate on constructs, you can safely address all three intents without every worrying about the validity of the syntax — ie only consider the minimal criteria for validity that would suffice for the particular disambiguation of intent and leave syntax mattars to the runtime.

More importantly, if you were to try to aggregate constructs together under the assumption that they can determine collectively determine validity, you will inadvertently diminish the constructional validity by extending beyond the reasonable scope of this new collective construct.

For instance, a collective construct that tries to invalidate the above statement can have at least two equally plausible and contradicting scenarios that would need to be factored into it to retain its constructional validity:

1. Ensure that the runtime (or bundler) does not opt for this extra syntax.
2. Ensure that the spec did not change since last updated your code.

So, while runtime parsers must always work with firm production rules, contemplative parsing can minimize the amount of assumptions it makes by working with constructs to safely operating on texts.
