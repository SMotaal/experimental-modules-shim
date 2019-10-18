# Articulative Parsing

Parsing ECMAScript sources involves a lot of complexities and is often taxing to perform redundantly and accurately at runtime on code that will be handed off to the runtime. That said, module loading can sometimes require such redundant parsing, to make subtle changes to bindings, among other things.

Code can be optimized ahead of time to eliminate some of the more complicated parsing obscurities. This process would be referred to as articulation, where the ultimate goal would be to make subtle refinements to implicit grammar features and to normalize statement structures in order to simplify chore of statically analyzing module-related features.

To put things in perspective, an alternative to this approach which has proven useful in many application is to start with generating ahead-of-time AST and use it throughout the pipeline. The AST approach can certainly lend very nicely to source manipulation, however, it entails an overwhelmingly large code base which usually requires third-party dependencies, all of which make it more challenging to safely and effectively maintain.

In all likelihood, the actual articulation parse would also incur the same costs and/or concerns associated with the AST approach. But instead, that would apply only ahead-of-time… in the building pipeline, in a worker, even on the server. And this is arguably the balancing trade-off which prioritizes the actual runtime.

> **Design Consideration**: Articulation parsing can also be useful for sanitizing evaluated code.

A somewhat working assumption here is that handling source text directly will result in the smallest parsing footprint and noise possible, and articulated source text would be the way to resolve to a leaner parser design for the runtime.

## Simplification

It makes sense to consider other ahead-of-time simplification of module-specific syntax features, including:

- Rewriting named export declarations as a single coalesced `export { … }` statement.
- Ganging of all static imports before the first statement in the body of the module.

## Disambiguation

It also makes sense to look for syntax features that can be made less ambiguous to a runtime parser without adding runtime costs.

For instance, consider the complexity involved in determining the intent of the solidus token in `… /g/i …` — which arguably looks like the start of a regular expression, but depending on the lexical context, can simply be a division sign just the same.

The rule for solidus is simple, if it is the start of an expression, it cannot be a division. But because of things like automatic semi-colon insertion (ASI), you often end up with compounding challenges if say this fragment of code was preceded by `… function a() {…} …`. Now, you first need to determine if the preceding feature is `FunctionDeclaration` or `FunctionExpression`, because only the former implicitly entails ASI and that the solidus actually occurs in the start of the first expression of the following statement.

On the other hand, by simply wrapping the regular expression in parentheses as `((/g/i))`, it becomes unambiguously at the start of an expression. And doing this ahead-of-time would can eliminate such complexity from taking place at runtime.

Doing this means that runtime parsing can use a leaner parse for normalized sources and only resolves to the more verbose parsing when dealing with ones that are not normalized.

Other places where disambiguation can help:

- Parenthesizing references for identifiers like `((async))` and `((yield))` where they are not keywords.

## Harmonization

Employing an articulation parse does not have to be restricted to mitigating disambiguation costs, where it can also be ideal to harmonize code to prepare it for the module loading process.

> **Important Note**: This kind of operation is not recommended unless absolutely reliable and proven to actually be significantly helpful to the module loading process.

So, in theory, we can employ articulation to address the issue of "identity discontinuity"… This is the problem that we sometimes encounter with objects crossing context boundaries and we end up with two seemingly identical objects but they infact have completely separate instances of the same prototype chains.

The particular case that can sometimes apply to module loaders across contexts and realms can be observed sometimes with discontinuities between a literal expression `{}` and `new Object()`… etc.

Here, we are only concerned about the specific cases where such discontinuities are strictly an undesired effect of modifications in the module loading process itself. And this would apply only in cases where a loader attempts to simulate global bindings.

For this simulation to reliably be attained, it requires work that can potentially be simplified with harmonization — for example, literal `[…]` expressions would be substituted with `globalThis.Array(…)`… etc.

With this kind of articulation in place, one can simply rewire the effective global bindings simply by overriding the scoped declaration of the `globalThis` without changing the body of the module itself.

---

_<center>To Be Continued…</center>_

---
