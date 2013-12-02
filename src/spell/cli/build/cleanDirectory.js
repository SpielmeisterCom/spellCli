define(
	'spell/cli/build/cleanDirectory',
	[
		'spell/cli/util/emptyDirectory'
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
