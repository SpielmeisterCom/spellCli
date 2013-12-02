define(
	'spell/cli/build/processSource',
	[
		'spell/cli/build/ast/anonymizeModuleIds',
		'spell/cli/build/ast/createAST',
		'spell/cli/build/ast/createSource',
		'spell/cli/build/ast/minifyAST'
	],
	function(
		anonymizeModuleIds,
		createAST,
		createSource,
		minifyAST
	) {
		return function( sourceChunk, minify, anonymizeModules ) {
			if( !minify && !anonymizeModules ) return sourceChunk

			var ast = createAST( sourceChunk )

			if( anonymizeModules ) {
				ast = anonymizeModuleIds( ast, [ 'spell/client/main' ] )
			}

			if( minify ) ast = minifyAST( ast )

			return createSource( ast, !minify )
		}
	}
)
