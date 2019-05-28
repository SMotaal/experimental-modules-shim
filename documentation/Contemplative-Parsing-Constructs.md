# Contemplative Parsing

## Constructs

> To know enough about the meaningful framing of any grammar production permutations that unambiguously determine some intent, makes it so that we can address or influence their effect without having to know precisely how it all fits in the larger scheme of the text in which they occur.

We're talk parsing constructs, which like any other grammar constructs, are simply meaningful sequences of productions that are meaningful because they follow oneanother with at least one invariant grammar production, ie keywords, punctuators… etc.

What sets constructs apart from the usual aggregate productions — those specified by ECMAScript grammar is:

1. they do not rely on the syntax validity of previous text
2. they do not determine intent with absolute certainty

In contrast they rely on meaningfully framing of productions to simply to identify and operate on strings of text of an unambiguous intent.

This is can elaborated in this simple example:

```
1. Starting with any invariant grammar production:

   • ‹export›

2. In absolute vaccum, it denotes nothing beyond its form:

   • Latin letters — "e" "x" "p" "o" "r" "t"

3. In a meaningful frame, it distinguishes from its identical forms:

   • Module code — syntactic frame (goal)
   • Word boundary — addressability frame (token)
   • Keyword — operative frame (role)

4. Followed by another, it constructively attributes further intent:

   • ‹export›~‹default›
   • ‹export›~‹const›

5. Followed by anything else, the intent is unambiguous:

   • ‹export›~‹const› ¬ ‹a›
   • ‹export›~‹const› ¬ ‹{›
```

A distinguishing differentiator for constructs is that do not contribute to or rely on the absolute determination of syntax validity. In fact, they offer latitude and flexibility in the premise that an incomplete one is not necessarily a parsing error, even if it likely is.

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

If you operate on constructs, you can safely address all three intents without every worrying about the validity of the syntax — ie you only worry of the constructional disambiguity of the constructs and leave syntax mattars to the runtime.

In fact, if you aggregate constructs so that you can determine that those three constructs do not meet certain constructional criteria, you will likely only fail to operate on code that might end up being accepted by the specific implementation and that can have at least two equally plausible and contradicting:

1. The runtime (or bundler) opts for extra syntax.
2. The spec changed and you did not yet update your code.

So while usual parsing focuses on firm grammar production rules for valid syntax, contemplative parsing relies on grammar constructs safely operating on texts that lack significant indications that violate the meaningful intent of the constructs themselves.
