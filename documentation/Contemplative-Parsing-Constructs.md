# Contemplative Parsing

## Constructs

> To know enough about the meaningful framing of any grammar production permutations that unambiguously determine some intent, makes it so that we can address or influence their effect without having to know precisely how it all fits in the larger scheme of the text in which they occur.

We're talk parsing constructs, which are sequences of productions that are meaningful because they follow oneanother and in which there is at least one unambiguous grammar feature, ie keyword, punctuator… etc.

What sets constructs apart from the usual aggregates — like ones in the ECMAScript spec — is:

1. they do not rely on the syntax validity of _all_ previous text
2. they do not determine intent with absolute certainty

In contrast they rely on meaningfully framing of productions to identify and operate on strings of text of an unambiguous intent.

This is can be demonstated as follows:

<table width:=fill-available margin:=0>
<colgroup><col><col width:=60%>
<tbody vertical-align:=middle>

<tr><td>

1. Starting with any invariant grammar production

<td><center>

`‹export›`

<tr><td>

2. In absolute vaccum, it denotes nothing beyond its form

<td><center>

Latin Sequence

`e` `x` `p` `o` `r` `t`

<tr><td >

3. In a meaningful frame, it distinguishes from other identical forms

<td><table width:=fill-available>
<tr><td text-align:=right>  Goal (Syntactic)
<td>                        Module Code
<tr><td text-align:=right>  Token (Sequential)
<td>                        Isolated Word
<tr><td text-align:=right>  Role (Logical)
<td>                        ECMAScript Keyword
</table>

<tr><td>

4. Followed by another, it constructively attributes some intent

<td><center>

`‹export›~‹default›`

`‹export›~‹const›`

<tr><td>

5. Followed by anything else, the intent is unambiguous

<td><center>

`‹export›~‹const› ¬ ‹a›`

`‹export›~‹const› ¬ ‹{›`

</table>

A differentiating aspect of constructs is that they neither contribute to or rely upon the syntax validity of the complete text. Because of that they offer latitude and flexibility with the assumption that an incomplete construct has no direct correlation with a syntax error thrown at runtime.

### Motivating Example

If we try to deal with code that is not (yet) standard ECMAScript syntax like:

```js
export * as components from 'components';
```

While this is theoretically straightforward from an AST standpoint, it is practically a lot more difficult to properly reconfigure an existing AST library to deal with this syntax.

If we take a constructs approach we can divide this statement into 3 sequentially terminating constructs:

<table width:=fill-available margin:=0>
<colgroup><col><col width:=60%>
<tbody vertical-align:=middle text-align:=center>

<tr>
<td>  `‹export›`
<td>  Declare module export(s)

<tr>
<td>  `‹*›~‹as›~‹components›`
<td>  Bind namespace entity

<tr>
<td>  `‹from›~‹'…'›`
<td>  Link against module

</table>

Those constructs share the following characteristics:

- [x] Independently valid ECMAScript grammar permutations forming (full or partial) expressions.
- [x] Semantically aligned with unambiguous intents based on respective permutations of the standard productions of the ECMAScript grammar
- [x] Do not make claim of the validity of the syntax or any contextual parameters — ie burden let to the consumer.
- [x] Can be independently addressed and correlated with other constructs for analysis or transformation — ie using partial syntax trees instead of snapshots of a full AST.

As the ECMAScript specs evolve, one can argue that such constructs will likely remain operatively valid to mutate for effect without worrying about runtime-specifics or artificially mimicing of the complexities of the runtime parser(s).

### Early Candidates

**Block/Module Scope**

- [x] Function/Class declaration
- [x] Variable declaration
- [ ] Destructuring variable declaration
- [ ] Parenthesized block declarations
- [ ] Function/Class expression
- [ ] Object literal expression
- [ ] Block expression
- [ ] Dynamic module specifiers
- [ ] Calls to `eval`
- [ ] Assignments **of** eval

**Module Scope**

- [x] Static module specifiers
- [x] Import bindings
- [x] Export bindings
