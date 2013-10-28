define(
	'spell/shared/build/target/android/AndroidBuilder',
	[
		'spell/shared/build/createBuilderType',
		'spell/shared/build/createDataFileContent',
		'spell/shared/build/createDebugPath',
		'spell/shared/build/createProjectLibraryFilePaths',
		'spell/shared/build/emptyDirectory',
		'spell/shared/build/processSource',
		'spell/shared/build/loadAssociatedScriptModules',
		'spell/shared/build/writeFile',
		'spell/shared/build/spawnChildProcess',
		'spell/shared/util/createModuleId',
		'spell/shared/util/hashModuleId',
		'spell/shared/build/resolveWindowsShortDirectoryName',

		'spell/shared/build/external/java',
		'spell/shared/build/external/javac',
		'spell/shared/build/external/android',
		'spell/shared/build/external/xsltproc',
		'spell/shared/build/external/jarsigner',
		'spell/shared/build/external/ant',
		'spell/shared/build/external/zipalign',

		'amd-helper',
		'child_process',
		'ff',
		'fs',
		'fsUtil',
		'path',
		'os',
		'wrench'
	],
	function(
		createBuilderType,
		createDataFileContent,
		createDebugPath,
		createProjectLibraryFilePaths,
		emptyDirectory,
		processSource,
		loadAssociatedScriptModules,
		writeFile,
		spawnChildProcess,
		createModuleId,
		hashModuleId,
		resolveWindowsShortDirectoryName,

		java,
		javac,
		android,
		xsltproc,
		jarsigner,
		ant,
		zipalign,

		amdHelper,
		child_process,
		ff,
		fs,
		fsUtil,
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
					contents = contents.toString()
						.replace( /extends Activity/g, 'extends com.tealeaf.TeaLeaf' )
						.replace( /setContentView\(R\.layout\.main\);/g, 'startGame();' )

					fs.writeFile( activityFile, contents, next )
				}
			)
		}


		var createBuildOptions = function( debug, projectId, androidBuildSettings ) {
			return {
				/**
				 * A package name must be constitued of two Java identifiers.
				 * Each identifier allowed characters are: a-z A-Z 0-9 _
				 */
				'package'         : androidBuildSettings.package ? androidBuildSettings.package : 'com.spelljs.' + projectId,
				'activity'        : '.' + projectId + 'Activity',

				'title'           : androidBuildSettings.title ? androidBuildSettings.title : projectId,
				'version'         : androidBuildSettings.version ? androidBuildSettings.version : '1.0',
				'versionCode'     : '1',

				'shortname'       : projectId,
				'disableLogs'     : debug ? 'false' : 'true',
				'debuggable'      : debug ? 'true' : 'false',
				'develop'         : debug ? 'true' : 'false',

				'orientation'     : androidBuildSettings.orientation ? androidBuildSettings.orientation : 'landscape',

				// unused parameters
				'appid'           : '',
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

			var spellCorePath = environmentConfig && environmentConfig.spellCorePath ?
				environmentConfig.spellCorePath :
				path.resolve( '../spellCore/build' )

			var spellAndroidPath = environmentConfig.spellAndroidPath

			var launchClientFile   = path.resolve( spellAndroidPath, 'launchClient.js' ),
				tealeafDebugPath   = path.resolve( spellAndroidPath, 'debug', 'TeaLeaf' ),
				tealeafReleasePath = path.resolve( spellAndroidPath, 'release', 'TeaLeaf' )

			var buildOptions = createBuildOptions( debug, projectId, androidBuildSettings ),
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
				tmpProjectTealeafPath   = path.join( tmpProjectPath, '..', 'TeaLeaf'),
				androidOutputPath       = path.join( outputPath, 'android' ),
				unsignedDebugApkFile    = path.join( tmpProjectPath, 'bin', name + '-debug.apk' ),
				unsignedReleaseApkFile  = path.join( tmpProjectPath, 'bin', name + '-release-unsigned.apk' ),
				unalignedReleaseApkFile = path.join( tmpProjectPath, 'bin', name + '-release-signed-unaligned.apk' ),
				signedReleaseApkFile    = path.join( tmpProjectPath, 'bin', name + '-release-signed.apk'),
                spellEngineFile         = createDebugPath( debug, 'spell.debug.js', 'spell.release.js', path.join( spellCorePath, 'lib' )),
				xslFile                 = path.join( spellAndroidPath, 'AndroidManifest.xsl' ),
				androidManifestFile     = path.resolve( debug ? tealeafDebugPath : tealeafReleasePath, 'AndroidManifest.xml' )

            console.log( '[spellcli] Cleaning ' + tmpProjectPath )
			emptyDirectory( tmpProjectPath )

			console.log( '[spellcli] Cleaning ' + androidOutputPath )
			emptyDirectory( androidOutputPath )

			var f = ff(
				function() {
					//Set timeout for prerequisite check to 5s
					f.timeout( 5000 )
				},
				function() {
					console.log( '[spellcli] Checking prerequisite: java' )
					java.checkPrerequisite( environmentConfig, f.wait(), f.fail )
				},
				function() {
					console.log( '[spellcli] Checking prerequisite: javac' )
					javac.checkPrerequisite( environmentConfig, f.wait(), f.fail )
				},
				function() {
					console.log( '[spellcli] Checking prerequisite: android-sdk' )
					android.checkPrerequisite( environmentConfig, f.wait(), f.fail )
				},
				function() {
					console.log( '[spellcli] Checking prerequisite: xsltproc' )
					xsltproc.checkPrerequisite( environmentConfig, f.wait(), f.fail )
				},
				function() {
					console.log( '[spellcli] Checking prerequisite: jarsigner' )
					jarsigner.checkPrerequisite( environmentConfig, f.wait(), f.fail )
				},
				function() {
					console.log( '[spellcli] Checking prerequisite: ant' )
					ant.checkPrerequisite( environmentConfig, f.wait(), f.fail )
				},
				function() {
					console.log( '[spellcli] Checking prerequisite: zipalign' )
					zipalign.checkPrerequisite( environmentConfig, f.wait(), f.fail )
				},
				function() {
                    console.log( '[spellcli] Checking prerequisite: spellCore build' )

                    if( !fs.existsSync( spellEngineFile ) ) {
                        f.fail( 'Could not find a spellCore build in ' + spellEngineFile )
                    }
                },
				function() {
					//check for all required files
					var requiredFiles = [
						xslFile,
						androidManifestFile,
						launchClientFile
					]

					requiredFiles.forEach( function( file ) {
						if( !fs.existsSync( file ) ) {
							f.fail( '[spellcli] Missing file ' + file )
						}
					})
				},
				function() {
					//Set timeout to 5 min
					f.timeout( 5 * 60 * 1000 )
				},
				function() {
					// copy the prebuild Tealeaf library into our temp directory
					wrench.copyDirSyncRecursive(
						debug ? tealeafDebugPath : tealeafReleasePath,
						tmpProjectTealeafPath,
						{
							forceDelete : true,
							preserveFiles : false,
							inflateSymlinks : false
						}
					)
				},
				function() {
					var parameters = [
						'create',     'project',
						'--target',   ANDROID_TARGET,
						'--name',     name,
						'--path',     tmpProjectPath,
						'--activity', activity,
						'--package',  buildOptions.package
					]

					console.log( '[spellcli] android ' + parameters.join(' ') )

					android.run( environmentConfig, parameters, tmpProjectPath, f.wait() )

				},
				function() {
					var parameters = [
						'update',    'project',
						'--target',  ANDROID_TARGET,
						'--path',    tmpProjectPath,
						'--library', '../TeaLeaf'
					]

					console.log( '[spellcli] android ' + parameters.join(' ') )

					android.run( environmentConfig, parameters, tmpProjectPath, f.wait() )

				},
				function() {
					var xsltprocParameters = xsltproc.createXsltProcCliParams(
						xslFile,
						path.resolve( tmpProjectTealeafPath, 'AndroidManifest.xml' ),
						path.resolve( tmpProjectPath, 'AndroidManifest.xml' ),
						buildOptions
					)

					console.log( '[spellcli] xsltproc ' + xsltprocParameters.join( ' ' ) )

					xsltproc.run( environmentConfig, xsltprocParameters, tmpProjectPath, f.wait() )

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
							fsUtil.copyFile( srcPath, dstPath )

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

					fsUtil.copyFile(
						launchClientFile,
						path.join( resourcesPath, 'native.js' )
					)

					// create application module and engine library file
					wrench.mkdirSyncRecursive( spelljsResourcesPath )

					writeFile(
						path.join( spelljsResourcesPath, 'data.js.mp3' ),
						createDataFileContent( scriptSource, cacheContent, projectConfig )
					)

					fsUtil.copyFile(
                        spellEngineFile,
						path.join( spelljsResourcesPath, 'spell.js.mp3' )
					)

					fsUtil.copyFiles(
						projectLibraryPath,
						libraryResourcesPath,
						createProjectLibraryFilePaths( projectLibraryPath, true )
					)
				},
				function() {
					//resolve sdk directory
					var sdkDir = environmentConfig.androidSdkPath || ""

					if( os.platform() == "win32" ) {
						resolveWindowsShortDirectoryName( sdkDir, f.slotPlain() )
					} else {
						f.pass( sdkDir )
					}

				},
				function( sdkDir ) {
					var antParameters = [
						debug ? 'debug' : 'release',
						'-Dsdk.dir=' + sdkDir
					]

					console.log( '[spellcli] ant ' + antParameters.join(' ') )

					ant.run( environmentConfig, antParameters, tmpProjectPath, f.wait() )
				},
				function() {
					if( !debug ) {
						if ( hasSigningSettings ) {
							var keyStorePath = path.resolve( projectPath, androidBuildSettings.signingKeyStore),
								parameters   = [
									'-sigalg',    'MD5withRSA',
									'-digestalg', 'SHA1',
									'-keystore',  keyStorePath,
									'-storepass', androidBuildSettings.signingKeyStorePass,
									'-keypass',   androidBuildSettings.signingKeyPass,
									'-signedjar', unalignedReleaseApkFile,
									unsignedReleaseApkFile,
									androidBuildSettings.signingKeyAlias
							]

							console.log( '[spellcli] jarsigner ' + parameters.join(' ') )

							jarsigner.run( environmentConfig, parameters, tmpProjectPath, f.wait());

						} else {
							console.log( '[spellcli] missing signingSettings; skipping jarsigner step' )
						}
					}
				},
				function() {
					if( !debug ) {
						if( hasSigningSettings ) {
							var parameters = [
								'-f', '-v', '4', unalignedReleaseApkFile, signedReleaseApkFile
							]

							console.log( '[spellcli] zipalign ' + parameters.join( ' ' ) )

							zipalign.run( environmentConfig, parameters, tmpProjectPath, f.wait())

						} else {
							console.log( '[spellcli] missing signingSettings; skipping zipalign step' )
						}
					}
				},
				function() {
					var apkFileName = ''

					if ( debug || hasSigningSettings ) {
						apkFileName = debug ? unsignedDebugApkFile : signedReleaseApkFile
					} else {
						apkFileName = unsignedReleaseApkFile
					}

					var outputFile  = path.join( androidOutputPath, path.basename( apkFileName ) )

					console.log( '[spellcli] cp ' + apkFileName + ' ' + outputFile )

					if( !debug && !hasSigningSettings ) {
						console.log( '[spellcli] No signing settings found, please sign ' + outputFile + ' manually' )
					}

					fsUtil.copyFile( apkFileName, outputFile )
				},
				next

			).onError( function( message ) {
					console.log( message )
			})
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
					this.environmentConfig,
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
