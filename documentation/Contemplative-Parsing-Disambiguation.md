# Contemplative Parsing

## Disambiguation

> **Work in process**: Please refer to the relevant section of this [log](/meta/logs/2019/2019-05/2019-05-10-Weekly.md#improve-experimental-ecmascript-matcher) for additional details.

### `/` Solidus

Abstract logic for a tokenizer-based approach:

```js markup-mode=es
  previousType === 'operator'
    ? previousText !== '++' && previousText !== '--'
    : previousType === 'closer'
    // FIXME: See `{…}` Closures below
    ? previousText === '}'
    : previousType === 'opener' || previousType === 'keyword'
```

### `{…}` Closures

Considerations for a construct-based approach to determine the goal for a `{…}` closure:

- Body blocks and Destructuring both have very constructs.
- Object literals do not have clean cut relationships to preceding invariants to yield good constructs, so they might be better determined by elimintation.
- Did we miss somebody?

> **Note**: Each construct shows the previous entity of its token classification (ie delimiter, punctuation, keyword… etc.) and denotes a single valid permutation explicitally denoting intermediate closures (as []), parent closures (as [ … ]), identifiers (as `$`) and ASI or physical semi-colons (as `;`).

#### Body Blocks

```js
;              {}    ;
; $:           {}    ;
=>             {}    ;
function $()   {}    ;
function* $()  {}    ;
function ()    {}    ;
function* ()   {}    ;
class          {}    ;
do             {}    ;
try            {}    ;
catch ()       {}    ;
catch          {}    ;
finally        {}    ;
while ()       {}    ;
if ()          {}    ;
else           {}    ;
for ()         {}    ;
{, $()         {}    }
{, []()        {}    }
class { $()    {}    }
class { []()   {}    }
```

#### Destructuring Declarations

```js
var            , {}    [, {} ]    {, $:{}}    ;
let            , {}    [, {} ]    {, $:{}}    ;
const          , {}    [, {} ]    {, $:{}}    ;
(              , {}    [, {} ]    {, $:{}}    ) =>
function $(    , {}    [, {} ]    {, $:{}}    ) {}
function* $(   , {}    [, {} ]    {, $:{}}    ) {}
function (     , {}    [, {} ]    {, $:{}}    ) {}
function* (    , {}    [, {} ]    {, $:{}}    ) {}
{, $(          , {}    [, {} ]    {, $:{}}    ) {}
{, [](         , {}    [, {} ]    {, $:{}}    ) {}
class { $(     , {}    [, {} ]    {, $:{}}    ) {}
class { [](    , {}    [, {} ]    {, $:{}}    ) {}
```

#### Object Literal

```js
operator      , {}    [, {} ]    {, $:{}}
keyword       , {}    [, {} ]    {, $:{}}
(             , {}    [, {} ]    {, $:{}}    )
```
