define(
	'spell/shared/build/initializeProjectDirectory',
	[
		'spell/shared/build/createDebugPath',
		'spell/shared/build/copyFile',
		'spell/shared/build/isDirectory',
		'spell/shared/build/isFile',

		'fs',
		'wrench',
		'path',
		'pathUtil',
		'underscore'
	],
	function(
		createDebugPath,
		copyFile,
		isDirectory,
		isFile,

		fs,
		wrench,
		path,
		pathUtil,
		_
	) {
		'use strict'


		var LIBRARY_PATH = 'library'

		/*
		 * Copies the contents of source path to target path recursively
		 *
		 * @param sourcePath
		 * @param targetPath
		 */
		var copyDirectory = function( sourcePath, targetPath ) {
			var filePaths = pathUtil.createPathsFromDirSync( sourcePath )

			_.each(
				filePaths,
				function( relativeFilePath ) {
					var sourceFilePath = path.join( sourcePath, relativeFilePath ),
						targetFilePath = path.join( targetPath, relativeFilePath ),
						targetDirectoryPath = path.dirname( targetFilePath )

					if( isDirectory( sourceFilePath ) ) return

					if( !fs.existsSync( targetDirectoryPath ) ) {
						wrench.mkdirSyncRecursive( targetDirectoryPath )
					}

					copyFile( sourceFilePath, targetFilePath )
				}
			)
		}

		/**
		 * Removes only those parts of the library which are contained in the spellCore library.
		 *
		 * @param spellCoreLibraryPath
		 * @param projectLibraryPath
		 */
		var clearTargetLibraryPath = function( spellCoreLibraryPath, projectLibraryPath ) {
			var descendantDirectoryPaths = pathUtil.createPathsFromDirSync(
				spellCoreLibraryPath,
				function( x ) {
					var absolutePath = path.resolve( spellCoreLibraryPath, x )

					return isDirectory( absolutePath )
				}
			)

			_.each(
				descendantDirectoryPaths,
				function( directoryPath ) {
					var absolutePath = path.resolve( projectLibraryPath, directoryPath )

					if( !isDirectory( absolutePath ) ) return

					wrench.rmdirSyncRecursive( absolutePath, true )
				}
			)
		}

		var createDefaultProjectConfig = function( apiVersion ) {
			return {
				"version": 1,
				"apiVersion": apiVersion,
				"config": {
					"supportedLanguages": []
				},
				"startScene": "",
				"type": "project",
				"scenes": []
			}
		}

		var writeProjectConfigFile = function( projectFilePath, projectConfig ) {
			fs.writeFileSync(
				projectFilePath,
				JSON.stringify( projectConfig, null, '\t' )
			)
		}

		var readProjectConfigFile = function( projectFilePath ) {
			return JSON.parse(
				fs.readFileSync( projectFilePath, 'utf8' )
			)
		}

		var lessVersionString = function( versionA, versionB, next ) {
			var partsA = versionA.split( '.' ),
				partsB = versionB.split( '.' )

			for( var i = 0, n = Math.max( partsA.length, partsB.length ), a, b; i < n; i++ ) {
				a = parseInt( partsA[ i ] || 0, 10 )

				if( _.isNaN( a ) ) {
					next( 'Error: Version number "' + versionA + '" has invalid syntax.' )
				}

				b = parseInt( partsB[ i ] || a - 1 , 10 )

				if( _.isNaN( b ) ) {
					next( 'Error: Version number "' + versionB + '" has invalid syntax.' )
				}

				if( a < b ) {
					return true
				}
			}

			return false
		}

		var createRelativeDirectoryPaths = function( currentPath ) {
			return fs.readdirSync( currentPath ).filter(
				function( x ) {
					return fs.statSync( path.join( currentPath, x ) ).isDirectory()
				}
			)
		}

		var isInitRequired = function( spellCoreLibraryPath, projectLibraryPath, projectApiVersion, toolApiVersion, next ) {
			if( lessVersionString( projectApiVersion, toolApiVersion, next ) ) {
				return true
			}

			// determine if any child directory of spellCoreLibraryPath is not contained in projectLibraryPath
			var sourceLibraryListing = createRelativeDirectoryPaths( spellCoreLibraryPath ),
				destLibraryListing   = createRelativeDirectoryPaths( projectLibraryPath )

			var isAllContained = _.all(
				sourceLibraryListing,
				function( x ) {
					return _.contains( destLibraryListing, x )
				}
			)

			return !isAllContained
		}

		var printSuccess = function() {
			console.log( 'Initializing completed successfully.' )
		}

		var createProjectDirectory = function( projectPath, next ) {
			try {
				wrench.mkdirSyncRecursive( projectPath )

			} catch( e ) {
				next( e.toString() )
			}
		}

		return function( spellCorePath, projectName, projectPath, projectFilePath, force, apiVersion, isDevEnv, next ) {
			var publicDirName        = 'public',
				outputPath           = path.join( projectPath, publicDirName ),
				html5OutputPath      = path.join( outputPath, 'html5' ),
				spellCoreLibraryPath = path.join( spellCorePath, LIBRARY_PATH ),
				projectLibraryPath   = path.join( projectPath, LIBRARY_PATH )

			if( !isDirectory( projectPath ) ) {
				createProjectDirectory( projectPath, next )
			}

			if( !isFile( projectFilePath ) ) {
				// initial creation of project config file
				writeProjectConfigFile(
					projectFilePath,
					createDefaultProjectConfig( apiVersion )
				)

			} else {
				// checking project config, updating when necessary
				var projectConfig = readProjectConfigFile( projectFilePath )

				if( !projectConfig ) {
					next( 'Error: Unable to read project config file "' + projectFilePath + '".' )
				}

				var projectApiVersion = projectConfig.apiVersion || '0',
					initRequired      = isInitRequired( spellCoreLibraryPath, projectLibraryPath, projectApiVersion, apiVersion, next )

				if( !initRequired &&
					!force ) {

					console.log( 'Initialization not required: project API version "' + projectApiVersion + '" is up-to-date.' )

					printSuccess()

					next()
				}

				if( force ) {
					console.log( 'Initialization forced: setting project API version from "' + projectApiVersion + '" to "' + apiVersion + '".' )

				} else if( initRequired ) {
					console.log( 'Initialization required: updating project API version from "' + projectApiVersion + '" to "' + apiVersion + '".' )
				}

				projectConfig.apiVersion = apiVersion
				writeProjectConfigFile( projectFilePath, projectConfig )
			}

			// create directory structure
			var directories = [
				publicDirName,
				'build',
				path.join( LIBRARY_PATH, projectName )
			]

			_.each(
				directories,
				function( directory ) {
					var fullPath = path.join( projectPath, directory )

					if( isDirectory( fullPath ) ) return

					wrench.mkdirSyncRecursive( fullPath )
				}
			)

			// remove old spell sdk library
			clearTargetLibraryPath( spellCoreLibraryPath, projectLibraryPath )

			// copy spell sdk library
			copyDirectory( spellCoreLibraryPath, projectLibraryPath )


			// populate public directory
			var fileNames = [
				'main.css',
				'spellEdShim.html'
			]

			_.each(
				fileNames,
				function( fileName ) {
					copyFile(
						path.join( spellCorePath, 'htmlTemplate', fileName ),
						path.join( projectPath, publicDirName, fileName )
					)
				}
			)

			if( !fs.existsSync( html5OutputPath ) ) {
				wrench.mkdirSyncRecursive( html5OutputPath )
			}

			// copying engine library
			copyFile(
				createDebugPath( true, 'spell.debug.js', 'spell.release.js', path.join( spellCorePath, 'lib' ) ),
				path.join( html5OutputPath, 'spell.js' )
			)

			// copying stage zero loader
			copyFile(
				createDebugPath( true, 'spell.loader.js', 'spell.loader.min.js', path.join( spellCorePath, 'lib' ) ),
				path.join( outputPath, 'spell.loader.js' )
			)

			printSuccess()

			next()
		}
	}
)
