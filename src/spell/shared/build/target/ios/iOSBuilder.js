define(
	'spell/shared/build/target/ios/iOSBuilder',
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

		'spell/shared/build/external/xcodebuild',
		'spell/shared/build/external/xcrun',

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

		xcodebuild,
		xcrun,

		amdHelper,
		child_process,
		ff,
		fs,
		fsUtil,
		path,
		os,
		wrench
	)
	{
		var build = function( environmentConfig, projectPath, projectLibraryPath, outputPath, target, projectConfig, library, cacheContent, scriptSource, minify, anonymizeModuleIds, debug, next ) {
            var projectId               = projectConfig.config.projectId || 'defaultProjectId',
                spellCorePath           = environmentConfig.spellCorePath,
				spelliOSPath            = environmentConfig.spelliOSPath || '../spelliOS/build',
                tealeafPath             = path.resolve( spelliOSPath, debug ? 'debug' : 'release', 'tealeaf' ),
                iOSBuildSettings        = projectConfig.config.ios || {},
                iOSBundleId             = iOSBuildSettings.bundleId ? iOSBuildSettings.bundleId : 'com.spelljs.' + projectId,
                tmpProjectPath          = path.join( projectPath, 'build', 'tmp', 'iOS', projectId ),
                resourcesPath           = path.join( tmpProjectPath, 'assets', 'resources' ),
                spellEngineFile         = createDebugPath( debug, 'spell.debug.js', 'spell.release.js', path.join( spellCorePath, 'lib' ))

            console.log( '[spellcli] Cleaning ' + tmpProjectPath )
            emptyDirectory( tmpProjectPath )

            var f = ff(
                function() {
                    //Set timeout for prerequisite check to 5s
                    f.timeout( 5000 )
                },
                function() {
                    console.log( '[spellcli] Checking prerequisite: spellCore build' )

                    if( !fs.existsSync( spellEngineFile ) ) {
                        f.fail( 'Could not find a spellCore build in ' + spellEngineFile )
                    }
                },
                function() {
                    console.log( '[spellcli] Checking prerequisite: xcodebuild' )
                    xcodebuild.checkPrerequisite( environmentConfig, f.wait(), f.fail )
                },
                function() {
                    console.log( '[spellcli] Checking prerequisite: xcrun' )
                    xcrun.checkPrerequisite( environmentConfig, f.wait(), f.fail )
                },
                function() {
                    console.log( '[spellcli] Checking prerequisite: installed iphone sdk' )
                    xcodebuild.getInstalledSdks( environmentConfig, f.slotPlain(), f.fail )
                },
                function( SDKs ) {
                    //TODO: check if iphoneos6.1 sdk is installed

                    console.log( SDKs )
                },
                function() {
                    //Set timeout to 5 min
                    f.timeout( 5 * 60 * 1000 )
                },
                function() {
                    // copy the prebuild Tealeaf library into our temp directory
                    wrench.copyDirSyncRecursive(
                        tealeafPath,
                        tmpProjectPath,
                        {
                            forceDelete : true,
                            preserveFiles : false,
                            inflateSymlinks : false
                        }
                    )
                },
                function () {
                    var params = [
                        '-target',
                        iOSBundleId,

                        '-sdk',
                        'iphoneos6.1',

                        '-configuration',
                        debug ? 'Debug' : 'Release',

                        '-jobs',
                        8
                    ]

                    xcodebuild.run(
                        environmentConfig,
                        params,
                        tmpProjectPath,
                        f.wait()
                    )

                }


                //sign app
            /*function () {
                    var args = [
                     '-sdk', 'iphoneos',
                     'PackageApplication',
                     '-v',
                     path.resolve(path.join(projectPath, 'build/'+configurationName+'-iphoneos/'+appName+'.app')),
                     '-o',
                     path.resolve(outputIPAPath),
                     '--sign',
                     'iPhone Developer: ' + developerName,
                     '--embed',
                     path.resolve(provisionPath)
                     ]

                    //xcrun.run( environmentConfig, params, '', f.wait() )

                }*/

			).onError( function( message ) {
				console.log( message )
			})

		}

		var TARGET_NAME    = 'ios',
			iOSBuilder = createBuilderType()

		iOSBuilder.prototype = {
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

		return iOSBuilder
	}
)