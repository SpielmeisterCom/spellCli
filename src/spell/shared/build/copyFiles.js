define(
	'spell/shared/build/copyFiles',
	[
		'spell/shared/build/copyFile',
		'spell/shared/build/isDirectory',

		'fs',
		'wrench',
		'path',
		'underscore'
	],
	function(
		copyFile,
		isDirectory,

		fs,
		wrench,
		path,
		_
	) {
		'use strict'


		return function( sourceDirectoryPath, targetDirectoryPath, filePaths ) {
			_.each(
				filePaths,
				function( filePathInfo ) {
					// indicates if the path and or name of the file changes from source to target location
					var isMoved = _.isArray( filePathInfo ) && filePathInfo.length === 2

					var sourceFilePath = isMoved ?
						filePathInfo[ 0 ] :
						path.resolve( sourceDirectoryPath,  filePathInfo )

					if( isDirectory( sourceFilePath ) ) return


					var targetFilePath = isMoved ?
						filePathInfo[ 1 ] :
						path.resolve( targetDirectoryPath,  filePathInfo )

					var targetPath = path.dirname( targetFilePath )

					if( !fs.existsSync( targetPath ) ) {
						wrench.mkdirSyncRecursive( targetPath )
					}

					copyFile( sourceFilePath, targetFilePath )
				}
			)
		}
	}
)
