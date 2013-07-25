define(
	'spell/shared/build/cleanDirectory',
	[
		'spell/shared/build/emptyDirectory'
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
