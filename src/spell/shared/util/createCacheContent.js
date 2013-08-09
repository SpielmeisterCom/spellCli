define(
	'spell/shared/util/createCacheContent',
	[
		'path',

		'underscore'
	],
	function(
		path,

		_
	) {
		'use strict'


		return function( resources ) {
			return _.reduce(
				resources,
				function( memo, resource ) {
					var	content     = resource.content,
						libraryPath = resource.filePath.split( path.sep ).join( '/' )

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
