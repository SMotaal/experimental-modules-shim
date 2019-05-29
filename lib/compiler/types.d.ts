//@ts-check

/// Compiler Types
type SourceRecord = import('./types/compiler').SourceRecord;
type BindingRecord = import('./types/compiler').BindingRecord;
type Node = import('./types/compiler').Node;
type RootNode = import('./types/compiler').RootNode;
type ConstructNode = import('./types/compiler').ConstructNode;
type ClosureNode = import('./types/compiler').ClosureNode;
type TemplateNode = import('./types/compiler').TemplateNode;
type TextNode = import('./types/compiler').TextNode;
type TokenNode = import('./types/compiler').TokenNode;

/// Tokenizer Types

type TokenizerToken = import('./types/tokenizer').Token;
type TokenizerTokens = import('./types/tokenizer').Tokens;
type TokenizerMatch = import('./types/tokenizer').Match;
type TokenizerCapture = import('./types/tokenizer').Capture;
type TokenizerGroup = import('./types/tokenizer').Group;
type TokenizerGroups = import('./types/tokenizer').Groups;
type TokenizerGoal = import('./types/tokenizer').Goal;
type TokenizerContext = import('./types/tokenizer').Context;
type TokenizerContexts = import('./types/tokenizer').Contexts;
type TokenizerState = import('./types/tokenizer').State;
