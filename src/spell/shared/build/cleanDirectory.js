define(
	'spell/shared/build/cleanDirectory',
	[
		'wrench'
	],
	function(
		wrench
	) {
		'use strict'


		return function( path ) {
			wrench.rmdirSyncRecursive( path, true )
			wrench.mkdirSyncRecursive( path )

			console.log( 'Cleaning completed successfully.' )
		}
	}
)
