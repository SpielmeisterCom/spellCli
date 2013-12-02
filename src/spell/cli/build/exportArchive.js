define(
	'spell/cli/build/exportArchive',
	[
		'spell/cli/build/cleanDirectory',
		'spell/cli/build/executeCreateBuild',

		'ff',
		'fs',
		'fsUtil',
		'wrench',
		'path',
		'pathUtil',
		'zipstream'
	],
	function(
		cleanDirectory,
		executeCreateBuild,

		ff,
		fs,
		fsUtil,
		wrench,
		path,
		pathUtil,
		ZipStream
	) {
		'use strict'


		var addFile = function( zip, rootPath, filePaths, next ) {
			var filePath = filePaths.shift()

			if( filePath ) {
				var absoluteFilePath = path.join( rootPath, filePath )

				if( fsUtil.isFile( absoluteFilePath ) ) {
					zip.addFile(
						fs.createReadStream( absoluteFilePath ),
						{ name : filePath.replace( /\/build\/release/, '' ) },
						function() {
							addFile( zip, rootPath, filePaths, next )
						}
					)

				} else {
					addFile( zip, rootPath, filePaths, next )
				}

			} else {
				zip.finalize(
					function( numBytesWritten ) {
						next()
					}
				)
			}
		}

		var createZipFile = function( outputFilePath, rootPath, fileNames, next ) {
			var zip = ZipStream.createZip( { level: 1 } ),
				out = fs.createWriteStream( outputFilePath )

			zip.pipe( out )

			addFile( zip, rootPath, fileNames, next )
		}


		return function( environmentConfig, projectPath, outputFilePath, target, forceSplashScreen, next ) {
			var outputPath         = path.dirname( outputFilePath ),
				projectsPath       = path.resolve( projectPath, '..' ),
				projectName        = path.basename( projectPath ),
				projectFilePath    = path.join( projectPath, 'project.json' ),
				projectBuildPath   = path.join( projectPath, 'build' ),
				inputPath          = path.join( projectBuildPath, 'release' ),
				minify             = true,
				anonymizeModuleIds = true,
				debug              = false

			if( !fs.existsSync( outputPath ) ) {
				wrench.mkdirSyncRecursive( outputPath )
			}

			var f = ff(
				function() {
					if( !target &&
						fs.existsSync( inputPath ) ) {

						return
					}

					console.log( 'cleaning...' )

					cleanDirectory( projectBuildPath )


					console.log( 'building...' )

					executeCreateBuild(
						environmentConfig,
						projectPath,
						projectFilePath,
						target,
						minify,
						anonymizeModuleIds,
						debug,
						forceSplashScreen,
						f.wait()
					)
				},
				function() {
					// create archive
					console.log( 'creating archive "' + outputFilePath + '"...' )

					var filter = function( filePath ) {
						var parts = filePath.split( path.sep )

						return parts.length >= 3 ?
							parts[ 0 ] == projectName && parts[ 1 ] == 'build' && parts[ 2 ] == 'release' :
							false
					}

					var filePaths = pathUtil.createPathsFromDirSync( projectPath, filter, 'include-base-path' )

					createZipFile( outputFilePath, projectsPath, filePaths, f.wait() )
				},
				function() {
					console.log( 'Exporting completed successfully.' )
				}
			).onComplete( next )
		}
	}
)
