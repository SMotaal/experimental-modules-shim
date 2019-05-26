# Maybe ECMAScript? Tokenization

A hidden gem behind a lot of ECMAScript parsing today is [sweet.js][sweet.js] which is a credit often shadowed by a lot of buzz about on more auxiliary things, like APIs for things that are potentially doing it right.

Trying to solve the solidus problem gives unique insights, but the most vital of which is right there in the spec — a solidus can only ever mean one thing, depending on where it occurs — the question is as Tim Disney tried to discover, how do we know where it occurs if that depends on similar looking tokens that have very different semantics.

The practical (as in used in practice until we know better) approach leads to very elaborate engineering feats — consider babel and typescript — or highly coupled works of genius — consider acorn cherow — all of which are sadly "parsers" that simply just don't do the execute part!

Even the original inspiration to many a tokenizer like those partical applications, that original gem reportedly now uses a "parser" — and this is very discouraging to say the least, that is if tokenization was designed for the wrong intent.

## Intent?!

When you tokenize, you cannot forget what your tokenization is meant to allow you to do — your partical application is in fact the intent of your tokenization protocols, that is not the same thing as motivation here because you are likely motivated to tokenize fast and get it right.

And while motivation to "get it right" means conformance to the spec, intent to get it right means the ability to know how to handle things that are not part of the spec, or at least not the one you are familiar with at this point. This goes full circle, where the only given is the human element.

[sweet.js]: https://github.com/sweet-js
