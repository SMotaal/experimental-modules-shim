(rule => rule`

ImportSpecifier:${rule`
  ‹identifier›${'ImportedBinding'}
  ‹identifier›${'IdentifierName'} as ‹identifier›${'ImportedBinding'}
`}

ImportList:${rule`
  { … ${'ImportSpecifier'} , }
`}

ImportDeclaration:${rule`
  ‹identifier›${'ImportedDefaultBinding'}
  ‹{…}›${'ImportList'}
  ‹identifier›${'ImportedDefaultBinding'} , ‹{…}›${'ImportList'}
`}

Root:${rule`
  import ${'ImportDeclaration'} from ‹string›${'ModuleSpecifier'}
`}

`)(
	(grammar =>
		(grammar = (strings, ...values) => {
			const {
				constructs = (grammar.constructs = {}),
				definitions = (grammar.definitions = {}),
				rules = (grammar.rules = {}),
			} = grammar;

			const rule = String.raw(string, ...values);

			let index = -1;
			for (const string of strings) {
				const value = values[index++];
			}
		}))(),
);


`
ImportDeclaration:
importImportClauseFromClause;
importModuleSpecifier;
ImportClause:
ImportedDefaultBinding
NameSpaceImport
NamedImports
ImportedDefaultBinding,NameSpaceImport
ImportedDefaultBinding,NamedImports
ImportedDefaultBinding:
ImportedBinding
NameSpaceImport:
*asImportedBinding
NamedImports:
{}
{ImportsList}
{ImportsList,}
FromClause:
fromModuleSpecifier
ImportsList:
ImportSpecifier
ImportsList,ImportSpecifier
ImportSpecifier:
ImportedBinding
IdentifierNameasImportedBinding
ModuleSpecifier:
StringLiteral
ImportedBinding:
BindingIdentifier[~Yield, ~Await]
`
