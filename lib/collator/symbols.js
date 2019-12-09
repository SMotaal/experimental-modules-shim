export const Construct = Symbol('Node.construct');
export const Trailer = Symbol('Node.trailer');
export const NextNode = Symbol('Node.nextNode');
export const PreviousNode = Symbol('Node.previousNode');
export const NextTokenNode = Symbol('Node.nextTokenNode');
export const PreviousTokenNode = Symbol('Node.previousTokenNode');
export const ParentNode = Symbol('Node.parentNode');
export const RootNode = Symbol('Node.rootNode');
export const LastKeyword = Symbol('Node.lastKeyword');
export const LastOperator = Symbol('Node.lastOperator');
export const LastBreak = Symbol('Node.lastBreak');
export const TokenContext = Symbol('Node.tokenContext');
export const ContextNode = Symbol('Node.contextNode');

export const FunctionConstruct = Symbol('Node.functionConstruct');
export const ClassConstruct = Symbol('Node.classConstruct');
export const VariableConstruct = Symbol('Node.variableConstruct');
export const ImportConstruct = Symbol('Node.importConstruct');
export const ExportConstruct = Symbol('Node.exportConstruct');
export const BindingConstruct = Symbol('Node.bindingConstruct');

export const ArgumentConstruct = Symbol('Node.argumentConstruct');
export const BlockConstruct = Symbol('Node.blockConstruct');

export const BindingClause = Symbol('Construct.bindingClause');
export const ExtendsClause = Symbol('Construct.extendsClause');
export const FromClause = Symbol('Construct.fromClause');
export const ClassBody = Symbol('Construct.classBody');
export const FunctionArguments = Symbol('Construct.functionArguments');
export const FunctionBody = Symbol('Construct.functionBody');
