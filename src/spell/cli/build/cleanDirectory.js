define(
	'spell/cli/build/cleanDirectory',
	[
		'spell/cli/build/emptyDirectory'
	],
	function(
		emptyDirectory
	) {
		'use strict'


		return function( path ) {
			emptyDirectory( path )

			console.log( 'Cleaning completed successfully.' )
		}
	}
)
