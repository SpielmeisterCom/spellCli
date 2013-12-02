define(
	'spell/cli/util/emptyDirectory',
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
