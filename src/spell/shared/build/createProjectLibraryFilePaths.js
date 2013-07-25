define(
	'spell/shared/build/createProjectLibraryFilePaths',
	[
		'path',
		'pathUtil'
	],
	function(
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
