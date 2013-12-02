define(
	'spell/cli/build/executeCreateBuild',
	[
		'spell/cli/build/createDebugPath',
		'spell/cli/build/createProjectLibraryFilePaths',
		'spell/cli/util/createModuleId',
		'spell/cli/build/processSource',
		'spell/cli/build/loadAssociatedScriptModules',
		'spell/cli/build/target/ios/iOSBuilder',
		'spell/cli/build/target/android/AndroidBuilder',
		'spell/cli/build/target/tizen/TizenBuilder',
		'spell/cli/build/target/web/WebBuilder',
		'spell/cli/util/createCacheContent',
		'spell/cli/util/createIdFromLibraryFilePath',
		'spell/cli/util/hashModuleId',

		'amd-helper',
		'ff',
		'fs',
		'path',
		'pathUtil',
		'underscore'
	],
	function(
		createDebugPath,
		createProjectLibraryFilePaths,
		createModuleId,
		processSource,
		loadAssociatedScriptModules,
		iOSBuilder,
		AndroidBuilder,
		TizenBuilder,
		WebBuilder,
		createCacheContent,
		createIdFromLibraryFilePath,
		hashModuleId,

		amdHelper,
		ff,
		fs,
		path,
		pathUtil,
		_
	) {
		'use strict'


		var loadJsonFromPaths = function( result, libraryPath, filePaths ) {
			var errors = []

			_.each(
				filePaths,
				function( filePath ) {
					var fullyQualifiedFilePath = path.join( libraryPath, filePath )

					var data = fs.readFileSync( fullyQualifiedFilePath, 'utf8' )

					try {
						var content = JSON.parse( data )

					} catch( e ) {
						if( _s.startsWith( e, 'SyntaxError' ) ) {
							errors.push( 'Error: Unexpected token \'' + _.last( e.toString().split( ' ' ) ) + '\' while parsing file \'' + fullyQualifiedFilePath + '\'.' )
						}
					}

					result.push( {
						content  : content,
						filePath : filePath
					} )
				}
			)

			return errors
		}

		var loadJsonFromLibrary = function( result, libraryPath ) {
			var jsonFilePaths = pathUtil.createFilePathsFromDirSync( libraryPath, [ 'json' ] )

			return loadJsonFromPaths( result, libraryPath, jsonFilePaths )
		}

		var readProjectConfigFile = function( filePath ) {
			return fs.readFileSync( filePath, 'utf8' )
		}

		var parseProjectConfig = function( projectConfigData, callback ) {
			var errors = [],
				projectConfig

			try {
				projectConfig = JSON.parse( projectConfigData )

			} catch( e ) {
				if( _s.startsWith( e, 'SyntaxError' ) ) {
					errors.push( e.toString() )

					callback( errors )
				}
			}

			return projectConfig
		}

		var createProjectConfig = function( projectConfigRaw ) {
			var result = _.pick( projectConfigRaw, 'name', 'startScene', 'libraryIds', 'config' )

			result.scenes = createSceneList( projectConfigRaw.scenes )

			return result
		}

		var createSceneList = function( scenes ) {
			return _.map(
				scenes,
				function( scene ) {
					return {
						entities : scene.entities,
						name     : scene.name,
						systems  : scene.systems
					}
				}
			)
		}

		var loadLibrary = function( projectLibraryPath, result ) {
			var library = [],
				errors  = loadJsonFromLibrary( library, projectLibraryPath )

			_.each(
				library,
				function( record ) {
					var type = record.content.type

					if( !result[ type ] ) {
						result[ type ] = [ record ]

					} else {
						result[ type ].push( record )
					}
				}
			)

			return errors
		}

		var loadScriptModules = function( projectLibraryPath, scripts ) {
			return _.reduce(
				scripts,
				function( memo, script ) {
					var moduleFilePath = path.join(
						projectLibraryPath,
						script.filePath.replace( /json$/, 'js' )
					)

					var module = amdHelper.loadModule( moduleFilePath )

					if( module ) {
						memo[ module.name ] = module
					}

					return memo
				},
				{}
			)
		}

		return function( environmentConfig, projectPath, projectFilePath, target, minify, anonymizeModuleIds, debug, forceSplashScreen, next ) {
			target = target || 'html5'

			var errors             = [],
				buildMode          = debug ? 'debug' : 'release',
				projectLibraryPath = path.join( projectPath, 'library' ),
				projectBuildPath   = path.join( projectPath, 'build' ),
				outputPath         = path.join( projectBuildPath, buildMode ),
				projectConfigData  = readProjectConfigFile( projectFilePath ),
				projectConfigRaw   = parseProjectConfig( projectConfigData, next ),
				projectConfig      = createProjectConfig( projectConfigRaw )

			// setting up environment config
			projectConfig.environment = {
				forceSplashScreen : forceSplashScreen
			}

			// loading the library
			var library = {}

			errors = errors.concat(
				loadLibrary( projectLibraryPath, library )
			)

			if( _.size( errors ) > 0 ) next( errors )

			// load all scripts
			var scriptModules = _.extend(
				loadScriptModules( projectLibraryPath, library.script ),
				loadAssociatedScriptModules( projectLibraryPath, library.scene ),
				loadAssociatedScriptModules( projectLibraryPath, library.system )
			)

			// generate script source
			var scriptSource = processSource(
				_.pluck( scriptModules, 'source' ).join( '\n' ),
				!debug, // minify
				!debug  // anonymizeModuleIds
			)

			// generate cache content
			var cacheContent = createCacheContent(
				_.flatten(
					_.pick(
						library,
						'asset',
						'component',
						'entityTemplate',
						'scene',
						'script',
						'system'
					),
					true
				)
			)

			var builderTypes = [ AndroidBuilder, TizenBuilder, iOSBuilder, WebBuilder ]

			//check project web build settings
			if( target === 'web' && projectConfig.config.web ) {
				var webConf = projectConfig.config.web,
					html5   = !!webConf.html5,
					flash   = !!webConf.flash

				if( flash && !html5 ) {
					target = 'flash'

				} else if( html5 && !flash ) {
					target = 'html5'

				} else if( !html5 && !flash ) {
					next( 'Error: Specify a web target in project.json.' )
				}
			}

			var builders = _.map(
				builderTypes,
				function( builderType ) {
					var builder = new builderType(
						environmentConfig,
						projectPath,
						projectLibraryPath,
						outputPath,
						target,
						projectConfig,
						library,
						cacheContent,
						scriptSource,
						minify,
						anonymizeModuleIds,
						debug
					)

					builder.init()

					return builder
				}
			)

			var foundBuilder = false,
				f            = ff( this )

			_.each(
				builders,
				function( builder ) {
					if( !builder.handlesTarget( target ) ) {
						return
					}

					foundBuilder = true

					f.next( function() {
						builder.build( f.wait() )
					} )
				}
			)

			if( !foundBuilder ) {
				next( 'Error: Build target "' + target + '" is not supported.' )
			}

			f.next( function() {
				console.log( 'Building completed successfully.' )
			} )

			f.onComplete( next )
		}
	}
)
