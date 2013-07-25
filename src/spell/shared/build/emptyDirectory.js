define(
	'spell/shared/build/emptyDirectory',
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
		}
	}
)
