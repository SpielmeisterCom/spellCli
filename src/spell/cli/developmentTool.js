define(
	'spell/cli/developmentTool',
	[
		'spell/cli/Certificates',
		'spell/cli/build/cleanDirectory',
		'spell/cli/build/executeCreateBuild',
		'spell/cli/exportArchive',
		'spell/cli/init/initializeProjectDirectory',
		'spell/cli/printLicenseInfo',
		'spell/cli/cert/commandHandler',
		'spell/cli/parse/commandHandler',

		'spell/BuildInfo',

		'commander',
		'fs',
		'fsUtil',
		'path',
		'pathUtil',
		'spell-license',
		'underscore'
	],
	function(
		Certificates,
		cleanDirectory,
		executeCreateBuild,
		exportArchive,
		initializeProjectDirectory,
		printLicenseInfo,
		certCommandHandler,
		parseCommandHandler,
		BuildInfo,

		commander,
		fs,
		fsUtil,
		path,
		pathUtil,
		license,
		_
	) {
		'use strict'


		var APP_NAME = 'SpellJS'

		var createLicenseInfo = function( licenseFilePath ) {
			return licenseFilePath ?
				license.createLicenseInfo(
					Certificates.LICENSE_PUBLIC_KEY,
					fs.readFileSync( licenseFilePath, 'utf8' ),
					BuildInfo.buildTimestamp
				) :
				undefined
		}

		var checkLicenseInfo = function( licenseInfo ) {
			if( !licenseInfo ) {
				printErrors( 'Error: No license installed. This feature requires a valid license to work.' )

				process.exit( 2 )

			} else {
				if( licenseInfo.error ) {
					printErrors( licenseInfo.error )

					process.exit( 2 )

				} else if( !licenseInfo.isInValidityPeriod ) {
					printErrors(
						'Error: Your license is not compatible with this version (' + BuildInfo.version + ') of the SpellJS framework. ' +
						'Please use a version that was released before ' + new Date( BuildInfo.buildTimestamp ).toDateString() + ' or consider acquiring a new license.'
					)

					process.exit( 2 )
				}
			}

			return true
		}

		var createForceSplashScreen = function( licenseInfo ) {
			return licenseInfo ?
				_.any(
					licenseInfo.productFeatures,
					function( feature ) {
						return feature.name === 'forceSplashScreen' &&
							feature.included
					}
				) :
				true
		}

		var printErrors = function( errors ) {
			if( errors &&
				errors.length > 0 ) {

				var tmp = []
				tmp = tmp.concat( errors )

				console.error( tmp.join( '\n' ) )

				return true
			}

			return false
		}

		var onComplete = function( error, result ) {
			if( error ) {
				printErrors( error )
				process.exit( 1 )
			}
		}

		var createProjectName = function( projectPath ) {
			return path.basename( projectPath )
		}

		var createProjectFilePath = function( projectPath ) {
			return path.join( projectPath, 'project.json' )
		}

		var checkProjectPath = function( projectPath ) {
			var projectFilePath = createProjectFilePath( projectPath )

			if( !fsUtil.isFile( projectFilePath ) ) {
				return [ 'Error: The directory "' + projectPath + '" does not contain a spell project.' ]
			}

			return []
		}

		var createProjectPath = function( cwd, project ) {
			return path.resolve( project || cwd )
		}

		var logProject = function( projectPath ) {
			console.log( 'Working on project directory "' + projectPath + '".' )
		}

		var createEnvironmentConfig = function( basePath, environmentConfigFilePath ) {
			try {
				var rawConfig = JSON.parse( fs.readFileSync( environmentConfigFilePath, 'utf8' ) )

			} catch( e ) {
				printErrors( 'Error: Parsing spell configuration file "' + environmentConfigFilePath + '" failed with: ' + e )
				process.exit( 1 )
			}

			var configKeys = [ 'androidSdkPath', 'tizenSdkPath', 'jdkPath', 'spellAndroidPath', 'spelliOSPath', 'spellCliPath', 'spellCorePath', 'spellFlashPath' ]

			var result = {}

			_.each(
				configKeys,
				function( key ) {
					var value = rawConfig[ key ]

					if( value === undefined ) {
						printErrors( 'Error: Invalid spell configuration file "' + environmentConfigFilePath + '". Configuration option "' + key + '" is missing.' )
						process.exit( 1 )
					}

					var resolvedDirPath = path.resolve( basePath, value )

					if( !fsUtil.isDirectory( resolvedDirPath ) ) {
						printErrors( 'Error: Parsing spell configuration file failed. Configuration option "' + key + '" points to non-existing directory "' + resolvedDirPath + '".' )
						process.exit( 1 )
					}

					result[ key ] = resolvedDirPath
				}
			)

			return result
		}

		var cleanCommand = function( cwd, licenseFilePath, command ) {
			var projectPath = createProjectPath( cwd, command.project ),
				errors      = checkProjectPath( projectPath ),
				licenseInfo = createLicenseInfo( licenseFilePath )

			checkLicenseInfo( licenseInfo )

			if( printErrors( errors ) ) {
				process.exit( 1 )
			}

			logProject( projectPath )
			console.log( 'cleaning...' )

			cleanDirectory( path.join( projectPath, 'build' ) )
		}

		var buildCommand = function( cwd, environmentConfig, licenseFilePath, target, command ) {
			var projectPath        = createProjectPath( cwd, command.project ),
				errors             = checkProjectPath( projectPath ),
				debug              = command.debug || false,
				minify             = !debug,
				anonymizeModuleIds = true,
				licenseInfo        = createLicenseInfo( licenseFilePath )

			checkLicenseInfo( licenseInfo )

			if( printErrors( errors ) ) {
				process.exit( 1 )
			}

			var projectFilePath = createProjectFilePath( projectPath )

			if( !fsUtil.isFile( projectFilePath ) ) {
				printErrors( 'Error: Missing project file "' + projectFilePath + '".' )

				process.exit( 1 )
			}

			logProject( projectPath )
			console.log( 'building...' )

			executeCreateBuild(
				environmentConfig,
				projectPath,
				projectFilePath,
				target,
				minify,
				anonymizeModuleIds,
				debug,
				createForceSplashScreen( licenseInfo ),
				onComplete
			)
		}

		var initCommand = function( spellCorePath, cwd, apiVersion, isDevEnv, licenseFilePath, command ) {
			var projectPath = createProjectPath( cwd, command.project ),
				force       = command.force,
				licenseInfo = createLicenseInfo( licenseFilePath )

			checkLicenseInfo( licenseInfo )

			logProject( projectPath )

			initializeProjectDirectory(
				spellCorePath,
				createProjectName( projectPath ),
				projectPath,
				createProjectFilePath( projectPath ),
				force,
				apiVersion,
				isDevEnv,
				onComplete
			)
		}

		var exportCommand = function( spellCorePath, cwd, environmentConfig, licenseFilePath, target, command ) {
			var projectPath = createProjectPath( cwd, command.project ),
				errors      = checkProjectPath( projectPath ),
				licenseInfo = createLicenseInfo( licenseFilePath )

			checkLicenseInfo( licenseInfo )

			if( printErrors( errors ) ) {
				process.exit( 1 )
			}

			var outputFilePath = _.isString( command.file ) ?
				path.resolve( command.file ) :
				path.resolve( projectPath, 'export.zip' )

			logProject( projectPath )

			exportArchive(
				environmentConfig,
				projectPath,
				outputFilePath,
				target,
				createForceSplashScreen( licenseInfo ),
				onComplete
			)
		}

		var infoCommand = function( spellCorePath, cwd, environmentConfigFilePath, command ) {
			var projectPath = createProjectPath( cwd, command.project ),
				errors      = checkProjectPath( projectPath )

			if( printErrors( errors ) ) {
				process.exit( 1 )
			}

			console.log( 'spellCore directory: ' + spellCorePath )
			console.log( 'project directory: ' + projectPath )
			console.log( 'spell config: ' + environmentConfigFilePath )
		}

		var licenseCommand = function( spellCorePath, cwd, isDevEnv, licenseFilePath, command ) {
			var humanReadable = !command.json,
				stdin         = command.stdin

			if( stdin ) {
				var accumulatedChunks = ''

				process.stdin.resume()
				process.stdin.setEncoding( 'utf8' )

				process.stdin.on(
					'data',
					function( chunk ) {
						accumulatedChunks += chunk
					}
				)

				process.stdin.on(
					'end',
					function() {
						var suppliedLicenseInfo = license.createLicenseInfo(
							Certificates.LICENSE_PUBLIC_KEY,
							accumulatedChunks,
							BuildInfo.buildTimestamp
						)

						if( suppliedLicenseInfo &&
							suppliedLicenseInfo.error ) {

							printErrors( suppliedLicenseInfo.error )

							process.exit( 2 )
						}

						printLicenseInfo(
							isDevEnv,
							humanReadable,
							suppliedLicenseInfo,
							onComplete
						)
					}
				)

			} else {
				var licenseInfo = createLicenseInfo( licenseFilePath )

				checkLicenseInfo( licenseInfo )
				printLicenseInfo( isDevEnv, humanReadable, licenseInfo, onComplete )
			}
		}

		return function( argv, cwd, basePath, isDevEnv ) {
			var environmentConfigFilePath = pathUtil.createConfigFilePath( basePath, APP_NAME, 'spellConfig.json' )

			if( !environmentConfigFilePath ) {
				printErrors( 'Error: Missing spell configuration file "spellConfig.json".' )

				process.exit( 1 )
			}

			var environmentConfig = createEnvironmentConfig( basePath, environmentConfigFilePath ),
				spellCorePath   = environmentConfig.spellCorePath,
				licenseFilePath = pathUtil.createConfigFilePath( basePath, APP_NAME, 'license.txt' )

			// prepare argv array
			if( argv.length < 3 ) {
				argv.push( '-h' )
			}

			var apiVersion = BuildInfo.version

			commander
				.version( apiVersion )

			commander
				.command( 'clean' )
				.option( '-p, --project [directory]', 'The path to the project directory. The default is the current working directory.' )
				.description( 'Cleans the build directory.' )
				.action( _.bind( cleanCommand, this, cwd, licenseFilePath ) )

			commander
				.command( 'build [target]' )
				.option( '-p, --project [directory]', 'The path to the project directory. The default is the current working directory.' )
				.option( '-d, --debug', 'creates a debug build' )
				.option( '-r, --release', 'creates a release build' )
				.description( 'Creates a build for a specific target; available targets: web, web-html5, web-flash, android, ios.' )
				.action( _.bind( buildCommand, this, cwd, environmentConfig, licenseFilePath ) )

			commander
				.command( 'export [target]' )
				.option( '-p, --project [directory]', 'The path to the project directory. The default is the current working directory.' )
				.option( '-f, --file [file]', 'the name of the output file' )
				.description( 'Creates a release version of the supplied targets and packages them into a zip archive.' )
				.action( _.bind( exportCommand, this, spellCorePath, cwd, environmentConfig, licenseFilePath ) )

			commander
				.command( 'info' )
				.option( '-p, --project [directory]', 'The path to the project directory. The default is the current working directory.' )
				.description( 'Prints information about current environment.' )
				.action( _.bind( infoCommand, this, spellCorePath, cwd, environmentConfigFilePath ) )

			commander
				.command( 'cert [command]' )
				.description( 'Certificate management; Valid commands are: genprivkey, gencsr' )
				.action( _.bind( certCommandHandler, this, environmentConfig ) )

			commander
				.command( 'parse [type] [file]' )
				.action( _.bind( parseCommandHandler, this, environmentConfig ) )

			commander
				.command( 'init' )
				.option( '-p, --project [directory]', 'The path to the project directory. The default is the current working directory.' )
				.option( '-f, --force', 'Forces a project initialization.' )
				.description( 'Initializes a project directory with project scaffolding.' )
				.action( _.bind( initCommand, this, spellCorePath, cwd, apiVersion, isDevEnv, licenseFilePath ) )

			commander
				.command( 'license' )
				.option( '-j, --json', 'Enables json ouput.' )
				.option( '-s, --stdin', 'Read license data from stdin.' )
				.description( 'Prints information about active license.' )
				.action( _.bind( licenseCommand, this, spellCorePath, cwd, isDevEnv, licenseFilePath ) )

			commander.parse( argv )
		}
	}
)
