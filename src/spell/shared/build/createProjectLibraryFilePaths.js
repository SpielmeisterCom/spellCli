define(
	'spell/shared/build/createProjectLibraryFilePaths',
	[
		'spell/functions',

		'path',
		'pathUtil'
	],
	function(
		_,

		path,
		pathUtil
	) {
		'use strict'


		return function( projectLibraryPath, ignoreOggFiles ) {
			var filter = function( filePath ) {
				var extension = path.extname( filePath )

				return extension !== '.js' &&
					extension !== '.json' &&
					( !ignoreOggFiles || extension !== '.ogg' )
			}

			return pathUtil.createPathsFromDirSync( projectLibraryPath, filter )
		}
	}
)
