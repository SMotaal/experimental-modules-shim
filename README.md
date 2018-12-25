# Modules (_alpha_)

Runtime-strapped Module subsystem.

## Scope

**What it aims to accomplish**

- Provide a way to model module loading problems and features.
- Provide a way to load modules regardless of platform capabilities.
- Provide a new castable module syntax designed for [ESM/x](./ESX.md) parity.

**What it does not try to do**

- Replace ESM or any other module format.

# Experiments — work in progress

Too early but feel free to inspect the console for now.

It does not load your modules or anything like that yet, so don't under estimate how much work is in progress!

## Browser

Works in latest Chrome, Safari, and Firefox (maybe Edge, don't know).

> **From Repo**
>
> Navigate to [./modules.html](https://smotaal.github.io/experimental/modules/alpha/modules.html) and check the console.

> **From JSBin (v5 only)**
>
> - [This one](https://jsbin.com/gist/ca92f577fe1be4ff8f4feb4a41062785?result=console) inlines the loader for hacking.
>
> - If you don't want to hack the actual loader but simply play with modules, consider [this bin instead](https://jsbin.com/gist/efa3165c507f816ed90925599148ae07?result=console) which simply imports the loader from this repo.

<!--

### Scrubber

Today we see a lot of experimentations with hybrid deployments, where packages target various environments using anything but conventional declarative aspects in their `package.json` files.

[Scrubber](https://smotaal.github.io/experimental/modules/scrub.html) examines real-world packages, or at least tries to, by modeling various dependency resolution trends.

-->

## Node.js

> **With `--experimental-modules`**
>
> `> node --experimental-modules index.mjs`

> **Without `--experimental-modules`**
>
> `> node index.js`

<!--
unpkg:lodash-es
-->
