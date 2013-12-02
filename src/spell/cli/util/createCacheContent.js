define(
	'spell/cli/util/createCacheContent',
	[
		'spell/cli/build/createLibraryPath',

		'underscore'
	],
	function(
		createLibraryPath,

		_
	) {
		'use strict'


		return function( resources ) {
			return _.reduce(
				resources,
				function( memo, resource ) {
					var	content     = resource.content,
						libraryPath = createLibraryPath( resource.filePath )

					if( _.has( memo, libraryPath ) ) {
						throw 'Error: Resource path duplication detected. Could not build.'
					}

					memo[ libraryPath ] = content

					return memo
				},
				{}
			)
		}
	}
)
