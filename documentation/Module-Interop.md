# Module Interop

The central problem to the adoption of the ECMAScript modules across the ecosystem at large boils down to a simple scheduling paradox — most existing modules expect synchronous `require`-on-demand, while ECMAScript modules of today offer either statically linked `import` or asynchronous `import`-on-demand.

The options on the table:

1. Stop using CommonJS (migrate).
2. Wrap CommonJS packages behind ECMAScript façades (one-way).
3. Somehow flatten the time axis hoping make everyone happy (two-way).

The last option is most appealing to many because of many reasons — I personally don't share any of them, except that it is an interesting challenge.

Why interop matters:

1. Code works as it, why change it (lazy).
2. Code works somehow, why break it (lame).
3. Code works as expected, why adopt something else (uninformed).
4. Code works specifically, can't and don't need to migrate (valid).
5. Interesting challenge, let me show you how (cool).

If you wrote a CommonJS package specifically designed to operate in Node.js and under the very specific scheduling nature of how your dependency graph loads — you are the right kind of enduser to have your needs met.

If you think ECMAScript modules vs. CommonJS is a comparison to have — you need to really do your homework, and in fear of not stating this harshly enough, you have zero appreciation of how ECMAScript has evolved and what it means to be part of this evolution.

If you think somehow somehow credits technical merit — you are a bad programmer.

If you think change in the tech space is an inconvenience — you are in the wrong space.

> **IMHO**: Harsh — right, well, maybe honesty here is a welcome change of pace.

## Interesting Challenge

Solving this problem by the runtime is something offensive (sentementally and practically) to all JavaScript programmers out there.

The broader solution entails simulating ECMAScript modules where necessary at least when runtime restrictions come without reliable fallback dynamics.

The interoperable one entails suspending synchronous execution flow for `require` until the necessary asynchronous operations complete.

A lot of specs are in play to try to close those gaps, but philosophically speaking, there is a more critical gap not being talked about, and my own concern (beyond our scope here) here is that ES2015 will likely go down as the first significant disenfranchisement of JavaScript programmers by the JavaScript committees and bodies.

### Simulating ECMAScript Modules

ECMAScript modules introduced magical one-way (readonly) bindings for the first time. Those bindings which have rather clean semantics to implementers and spec authors, they do not transpile to outdated platforms without overhead and endless myriad of potential points-of-failures that make any such port for disadvantage platforms nonsensical and ironic in retrospect.

> **IMHO**: If you disagree because you bundle or rely on runtime-specific aspects, you are just making my point.

As romans do, in any JavaScript runtime, it should not be about tooling, but rather what it would take to retrofit realtime what is speced out to be realtime behavior.

The roman way to solve those bindings requires:

1. Safe Parsing — for static analysis and semantic instrumention.
2. Generator functions — for seemingly synchronous interlinking.
3. Proxy Scoping (ie `with` blocks) — for first-class contextual interlacing.

> **IMHO**: One-way variables would be the JavaScript thing to have speced to avoid all this.

Aside from obvious performance and overhead concerns, where this approach really fails to deliver is retrofitting for legacy runtimes, and while that is not very roman-like, it is relatively speaking as roman as it can get with all options compared.

The façade approach to solve this:

1. Tools — which you only need not use where not supported (not portable).
2. Tools — which you only need not use when outdated (not reliable).
3. Tools — which you only need not use with pure logic (not consistent).
4. Tools — which you only need not use while not happy (rudely opinionated).

> **IMHO**: In choosing the façade, you cannot see the reality, and your expectations lead you from enduser to (mis)guided consumer. But also to be fair, there are really good tools designed with questions of compromise never being ones of lost quality and competitive overpromise… it falls on you as a consumer to practice safe consumerism.

Contextual interlacing is the closest we can get to bindings, except those variables exist one-level removed from the actual binding scope. And this would have been fine if we only had `var` declarations. But the same spec revision which brought us bindings, it also introduced scoped `const` and `let` declarations that break semantics for the interlacing approach.

So to recap, for ES2015+ contextual interlacing fails due to scoped declarations, and in legacy runtimes it breaks because they do not have proxies. Both of which require static analysis of source text.

Since bindings fundamentally behave as property getters attached directly to scoped variables, it is reasonable to assume that preemptive or dynamic seemingly synchronous wiring will need to take place behind the scenes.

Generator functions here cleanly abstract this zebra-striping or layering flow of execution whereby wiring of all necessary bindings across the graph and more importantly ones resulting in otherwise blocking circularity vectors would first take place prior to respective code execution.

> **IMHO**: Generators being available to ES2015 runtimes ironically renders them useless for retrofitting in legacy, but the fact that they were actually introduced and not elevated to be runtime-only behavior is worthy of emoji hearts to those who fought for this to happen.

Safe parsing is the necessary evil that makes it possible to statically analyze and instrument code to elicit the expected semantics. This one is one us, we have to fill it, it is absolutely a userland thing. However, some also believe that parsed AST should be a delegated task of the JavaScript engine itself.

> **IMHO**: Engine-generated AST would come with a lot of advantages, maybe some hidden drawbacks, but only if it is backported or also paired with well maintained standalone official offerings by the actual implementors of the actual engines — as in, maybe this would have been a good design principle to subscribe to early on.

### Meta-Synchronous CommonJS Flows

CommonJS not being a spec thing, it warrants not much discussion beyond the assumed responsible thing expected of package authors that anything CommonJS that can be ported, would need to be ported, not to Pseudo-ESM that only works with transpilers, to actual ECMAScript module code.

However, just theoretically speaking, let's consider what it would take, if somehow you use an actual module pattern for a use case that does not become obsolete outside of the CommonJS paradigm itself.

The fact that you need CommonJS means you do not need ESM. Somehow people think of this in slipperyslopes, but the bottomline here is that you could not have dependended on ESM if your CommonJS predates it, and yet your reliance on dependencies which have opted for migrating out does not make good argument for your expectations of equal interoperability. Wanting seemless migration without doing the work, this will not be solved by magic, so stop stalling, do the work.

```js
(async () => {
	class Scheduler {
		constructor({consumer, provider}) {
			this.scheduler = new.target.scheduler();
			this.provider = provider(this);
			return consumer(this);
		}

		dispose() {
			this.scheduler.return();
    }

    next({request, response}) {
      if (request !== undefined) {

      } else if (response !== undefined) {

      }
    }

		request(request) {
			const result = this.scheduler.next({request});
			return {request, ...result};
		}

		async respond(response) {
			const result = this.scheduler.next({response});
			return {response, ...result};
		}

		static *scheduler() {
			let request, response;
			while (true) {
				({request, response} = yield {request, response});
			}
		}
	}

	// async function provider(scheduler) {
	// 	let request;
	// 	let response = 0;
	// 	while ((request = await scheduler.respond({request, response: response++}))) {
	// 		request = request.request;
	// 	}
	// }

	function consumer(scheduler) {
		const result = Array(5)
			.fill(undefined)
			.map((v, i) => ({response: scheduler.request(1 + i), request: 1 + i}));
		scheduler.dispose();
		return result;
	}

	const result = new Scheduler({consumer, provider});

	returned === (await result) ? console.log('sync', {returned}) : console.warn('async', {returned});
})();
```
