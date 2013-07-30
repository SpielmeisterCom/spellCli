define(
	'spell/shared/build/target/android/AndroidBuilder',
	[
		'spell/shared/build/createBuilderType',
		'spell/shared/build/createDataFileContent',
		'spell/shared/build/createDebugPath',
		'spell/shared/build/createProjectLibraryFilePaths',
		'spell/shared/build/copyFile',
		'spell/shared/build/copyFiles',
		'spell/shared/build/emptyDirectory',
		'spell/shared/build/processSource',
		'spell/shared/build/isFile',
		'spell/shared/build/loadAssociatedScriptModules',
		'spell/shared/build/writeFile',
		'spell/shared/build/spawnChildProcess',
		'spell/shared/util/createModuleId',
		'spell/shared/util/hashModuleId',

		'amd-helper',
		'child_process',
		'ff',
		'fs',
		'path',
		'os',
		'wrench'
	],
	function(
		createBuilderType,
		createDataFileContent,
		createDebugPath,
		createProjectLibraryFilePaths,
		copyFile,
		copyFiles,
		emptyDirectory,
		processSource,
		isFile,
		loadAssociatedScriptModules,
		writeFile,
		spawnChildProcess,
		createModuleId,
		hashModuleId,

		amdHelper,
		child_process,
		ff,
		fs,
		path,
		os,
		wrench
	) {
		'use strict'


		var ANDROID_TARGET = 'android-15'

		var updateActivity = function(namespace, activity, destDir, next) {
			var activityFile = path.join( destDir, 'src/' + namespace.replace( /\./g, '/' ) + '/' + activity + '.java' )

			if( !fs.existsSync( activityFile ) ) {
				return
			}

			fs.readFile(
				activityFile,
				null,
				function( err, contents ) {
					contents = contents
						.replace( /extends Activity/g, 'extends com.tealeaf.TeaLeaf' )
						.replace( /setContentView\(R\.layout\.main\);/g, 'startGame();' )

					fs.writeFile( activityFile, contents, next )
				}
			)
		}


		var createXsltProcCliParams = function( XslFile, sourceXmlFile, destinationXmlFile, buildOptions ) {
			var cliParams = []

			for( var key in buildOptions ) {
				cliParams.push( '--stringparam' )
				cliParams.push( key )
				cliParams.push( buildOptions[ key ] )
			}

			cliParams.push( '--output' )
			cliParams.push( destinationXmlFile )

			cliParams.push( XslFile )
			cliParams.push( sourceXmlFile )

			return cliParams
		}

		var createBuildOptions = function( debug, projectId ) {
			return {
				/**
				 * A package name must be constitued of two Java identifiers.
				 * Each identifier allowed characters are: a-z A-Z 0-9 _
				 */
				'package'         : 'com.kaisergames.' + projectId, //namespace,
				'activity'        : '.' + projectId + 'Activity',

				'title'           : 'Jungle Chaos', // title underneath the icon
				'version'         : '1.0', // is shown in app manager
				'versionCode'     : '1',

				'shortname'       : projectId,
				'disableLogs'     : debug ? 'false' : 'true',
				'debuggable'      : debug ? 'true' : 'false',
				'develop'         : debug ? 'true' : 'false',

				'orientation'     : 'landscape', // landscape, unspecified

				// unused parameters
				'appid'           : 'Jungle Chaos',
				'gameHash'        : '1.0',
				'sdkHash'         : '1.0',
				'androidHash'     : '1.0',
				'studioName'      : '',
				'codeHost'        : '127.0.0.1',
				'tcpHost'         : '127.0.0.1',
				'codePort'        : '80',
				'tcpPort'         : '4747',
				'entryPoint'      : '',
				'pushUrl'         : 'http://127.0.0.1/push/%s/?device=%s&amp;version=%s',
				'servicesUrl'     : 'http://127.0.0.1',
				'installShortcut' : 'false',
				'contactsUrl'     : ''
			}
		}

		var build = function( environmentConfig, projectPath, projectLibraryPath, outputPath, target, projectConfig, library, cacheContent, scriptSource, minify, anonymizeModuleIds, debug, next ) {
			var projectId            = projectConfig.config.projectId || 'defaultProjectId',
				androidBuildSettings = projectConfig.config.android || {},
				hasSigningSettings   = androidBuildSettings.signingKeyStore && androidBuildSettings.signingKeyStorePass && androidBuildSettings.signingKeyAlias && androidBuildSettings.signingKeyPass

			var spellCorePath = path.resolve(
				environmentConfig && environmentConfig.spellCorePath ?
					environmentConfig.spellCorePath :
					'../spellCore/build'
			)

			var spellAndroidPath = path.resolve(
				environmentConfig && environmentConfig.spellAndroidPath ?
					environmentConfig.spellAndroidPath :
					'../spellAndroid'
			)

			var platform = os.platform() == 'darwin' ? 'osx-ia32' : 'linux-ia32'

			var jdkPath = path.resolve(
				environmentConfig && environmentConfig.jdkPath ?
					environmentConfig.jdkPath :
					'../spellAndroid/modules/jdk/' + platform
			)

			var androidSDKPath = path.resolve(
				environmentConfig && environmentConfig.androidSDKPath ?
					environmentConfig.androidSDKPath :
					'../spellAndroid/modules/android-sdk/' + platform
			)

			var xslFile            = path.resolve( spellAndroidPath, 'modules', 'native-android', 'AndroidManifest.xsl' ),
				launchClientFile   = path.resolve( spellAndroidPath, 'launchClient.js' ),
				tealeafDebugPath   = path.resolve( spellAndroidPath, 'build', 'debug', 'TeaLeaf' ),
				tealeafReleasePath = path.resolve( spellAndroidPath, 'build', 'release', 'TeaLeaf' ),
				androidTool        = path.resolve( androidSDKPath, 'tools', 'android' ),
				zipalignTool       = path.resolve( androidSDKPath, 'tools', 'zipalign' )

			var buildOptions = createBuildOptions( debug, projectId ),
				name         = buildOptions.shortname,
				activity     = ( buildOptions.activity.substring( 0, 1 ) == '.' ) ? buildOptions.activity.substring( 1 ) : buildOptions.activity

			// add component scripts to scriptSource
			var componentScripts = loadAssociatedScriptModules( projectLibraryPath, library.component )

			scriptSource += ',' + processSource(
				_.pluck( componentScripts, 'source' ).join( '\n' ),
				!debug, // minify
				!debug  // anonymizeModuleIds
			)

			// set up temporary android project
			var tmpProjectPath          = path.join( projectPath, 'build', 'tmp', 'android', projectId ),
				resourcesPath           = path.join( tmpProjectPath, 'assets', 'resources' ),
				tealeafPath             = path.join( tmpProjectPath, '..', 'TeaLeaf' ),
				androidOutputPath       = path.join( outputPath, 'android' ),
				unsignedDebugApkFile    = path.join( tmpProjectPath, 'bin', name + '-debug.apk' ),
				unsignedReleaseApkFile  = path.join( tmpProjectPath, 'bin', name + '-release-unsigned.apk' ),
				unalignedReleaseApkFile = path.join( tmpProjectPath, 'bin', name + '-release-signed-unaligned.apk' ),
				signedReleaseApkFile    = path.join( tmpProjectPath, 'bin', name + '-release-signed.apk'),
                spellEngineFile         = createDebugPath( debug, 'spell.debug.js', 'spell.release.js', path.join( spellCorePath, 'lib' ) )



            console.log( '[spellcli] Cleaning ' + tmpProjectPath )
			emptyDirectory( tmpProjectPath )

			console.log( '[spellcli] Cleaning ' + androidOutputPath )
			emptyDirectory( androidOutputPath )

			var javaChildProcessOptions = {
				cwd : tmpProjectPath,
				env : { JAVA_HOME : jdkPath }
			}

			var f = ff(
				function() {
					console.log( '[spellcli] Checking prerequisite: jdk6 installed' )
					// TODO
				},
				function() {
					console.log( '[spellcli] Checking prerequisite: android tool and android api level 15' )

					if( fs.existsSync( androidTool ) ) {
						var nextff = f.wait()

						child_process.exec(
							androidTool + ' list',
							function( error, stdout, stderr ) {

								if( error !== null ) {
									f.fail( error )
								}

								if( stdout.toString().match( /android-15/g ) ) {
									nextff( error, stdout.toString() )

								} else {
									nextff(
										'Android API level 15 is not installed in your local android sdk. Please run the android tool manually and install it.',
										stdout.toString()
									)
								}
							}
						)

					} else {
						f.fail( 'Could not find android tool in ' + androidTool + '. Please check your androidSDKPath settings.' )
					}
				},
                function() {
                    console.log( '[spellcli] Checking prerequisite: spellCore build' )

                    if( !fs.existsSync( spellEngineFile ) ) {
                        f.fail( 'Could not find a spellCore build in ' + spellEngineFile )
                    }
                },
				function() {
					// copy the prebuild Tealeaf library into our temp directory
					wrench.copyDirSyncRecursive(
						debug ? tealeafDebugPath : tealeafReleasePath,
						tealeafPath,
						{
							forceDelete : true,
							preserveFiles : false,
							inflateSymlinks : false
						}
					)
				},
				function() {
					console.log( '[spellcli] Creating temporary android project in ' + tmpProjectPath )

					spawnChildProcess(
						androidTool,
						[
							'create',     'project',
							'--target',   ANDROID_TARGET,
							'--name',     name,
							'--path',     tmpProjectPath,
							'--activity', activity,
							'--package',  buildOptions.package
						],
						javaChildProcessOptions,
						true,
						f.wait()
					)
				},
				function() {
					console.log( '[spellcli] Adding libtealeaf as dependency for the android project' )

					spawnChildProcess(
						androidTool,
						[
							'update',    'project',
							'--target',  ANDROID_TARGET,
							'--path',    tmpProjectPath,
							'--library', '../TeaLeaf'
						],
						javaChildProcessOptions,
						true,
						f.wait()
					)
				},
				function() {
					console.log( '[spellcli] Patching AndroidManifest.xml file' )

					var xsltprocParameters = createXsltProcCliParams(
						xslFile,
						path.resolve( tealeafPath, 'AndroidManifest.xml' ),
						path.resolve( tmpProjectPath, 'AndroidManifest.xml' ),
						buildOptions
					)

					spawnChildProcess(
						'xsltproc',
						xsltprocParameters,
						{
							cwd : tmpProjectPath
						},
						true,
						f.wait()
					)
				},
				function() {
					console.log( '[spellcli] Patching ' + activity + '.java' )

					updateActivity(
						buildOptions.package,
						activity,
						tmpProjectPath,
						f.wait()
					)
				},
				function() {
					console.log( '[spellcli] Copying icon resources into android project' )

					var dpi = [ 'ldpi', 'mdpi', 'hdpi', 'xhdpi' ]

					for( var i = 0; i< dpi.length; i++ ) {
						var key     = dpi[ i ],
							srcPath = path.join( projectPath, 'resources', 'android', 'drawable-' + key ),
							dstPath = path.join( tmpProjectPath, 'res', 'drawable-' + key )

						if( fs.existsSync( srcPath ) ) {
							wrench.copyDirSyncRecursive(
								srcPath,
								dstPath,
								{
									forceDelete : true,
									preserveFiles : false,
									inflateSymlinks : false
								}
							)

						} else {
							console.log('[spellcli] WARN did not find icons in ' + srcPath )
						}

					}
				},
				function() {
					console.log( '[spellcli] creating assets/resources directory' )

					wrench.mkdirSyncRecursive( resourcesPath )
				},
				function() {
					console.log( '[spellcli] Copying splash screen resources into android project' )

					var splashSizes = [ '512', '1024', '2048' ]

					for( var i = 0; i < splashSizes.length; i++ ) {
						var key     = splashSizes[ i ],
							srcPath = path.join( projectPath, 'resources', 'android', 'splash-' + key + '.png' ),
							dstPath = path.join( resourcesPath, 'splash-' + key + '.png' )

						if( fs.existsSync( srcPath ) ) {
							copyFile( srcPath, dstPath )

						} else {
							console.log('[spellcli] WARN did not find splash screen ' + srcPath )
						}
					}
				},
				function() {
					console.log( '[spellcli] Populating the android project with SpellJS project resources' )


					// copy project library directory
					var libraryResourcesPath = path.join( resourcesPath, 'library' ),
						spelljsResourcesPath = path.join( resourcesPath, 'spelljs' )

					copyFile(
						launchClientFile,
						path.join( resourcesPath, 'native.js.mp3' )
					)

					// create application module and engine library file
					wrench.mkdirSyncRecursive( spelljsResourcesPath )

					writeFile(
						path.join( spelljsResourcesPath, 'data.js.mp3' ),
						createDataFileContent( scriptSource, cacheContent, projectConfig )
					)

					copyFile(
                        spellEngineFile,
						path.join( spelljsResourcesPath, 'spell.js.mp3' )
					)

					copyFiles(
						projectLibraryPath,
						libraryResourcesPath,
						createProjectLibraryFilePaths( projectLibraryPath, true )
					)
				},
				function() {
					console.log( '[spellcli] Running ant in ' + tmpProjectPath + ' to build the android project' )

					// build the android project
					spawnChildProcess(
						'ant',
						[ debug ? 'debug' : 'release' ],
						javaChildProcessOptions,
						true,
						f.wait()
					)
				},
				function() {
					if( !debug && hasSigningSettings ) {
						var keyStorePath = path.resolve( projectPath, androidBuildSettings.signingKeyStore )

						console.log( '[spellcli] Signing ' + unsignedReleaseApkFile + ' with key ' + androidBuildSettings.signingKeyAlias + ' from keyStore ' + keyStorePath )

						spawnChildProcess(
							'jarsigner',
							[
								'-sigalg',    'MD5withRSA',
								'-digestalg', 'SHA1',
								'-keystore',  keyStorePath,
								'-storepass', androidBuildSettings.signingKeyStorePass,
								'-keypass',   androidBuildSettings.signingKeyPass,
								'-signedjar', unalignedReleaseApkFile,
								unsignedReleaseApkFile,
								androidBuildSettings.signingKeyAlias
							],
							javaChildProcessOptions,
							true,
							f.wait()
						)
					}
				},
				function() {
					if( !debug && hasSigningSettings ) {
						console.log( '[spellcli] Aligning signed unaligned apk file ' + unalignedReleaseApkFile + ' and save it as ' + signedReleaseApkFile )

						spawnChildProcess(
							zipalignTool,
							[
								'-f', '-v', '4', unalignedReleaseApkFile, signedReleaseApkFile
							],
							javaChildProcessOptions,
							true,
							f.wait()
						)
					}
				},
				function() {
					var apkFileName = debug ? unsignedDebugApkFile : signedReleaseApkFile,
						outputFile  = path.join( androidOutputPath, path.basename( apkFileName ) )

					console.log( '[spellcli] Copying ' + apkFileName + ' into ' + outputFile )

					copyFile( apkFileName, outputFile )
				},
				next
			)
		}

		var TARGET_NAME    = 'android',
			AndroidBuilder = createBuilderType()

		AndroidBuilder.prototype = {
			init : function() {},
			getName : function() {
				return TARGET_NAME
			},
			handlesTarget : function( x ) {
				return x === 'all' ||
					x === TARGET_NAME
			},
			build : function( next ) {
				console.log( 'building for target "' + TARGET_NAME + '"...' )

				build(
					this.spellCorePath,
					this.projectPath,
					this.projectLibraryPath,
					this.outputPath,
					this.target,
					this.projectConfig,
					this.library,
					this.cacheContent,
					this.scriptSource,
					this.minify,
					this.anonymizeModuleIds,
					this.debug,
					next
				)
			}
		}

		return AndroidBuilder
	}
)
