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

		'spell/shared/build/external/ios/xcodebuild',
		'spell/shared/build/external/ios/xcrun',
		'spell/shared/build/target/ios/XCodeProjectHelper',

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

		XcodeProjectHelper,

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
                tmpProjectPath          = path.join( projectPath, 'build', 'tmp', 'ios', projectId ),
				projectFile             = path.join( tmpProjectPath, 'TeaLeafIOS.xcodeproj', 'project.pbxproj' ),
				plistFile               = path.join( tmpProjectPath, 'TeaLeafIOS-Info.plist'),
                configFile              = path.join( tmpProjectPath, 'resources', 'config.plist'),
                resourcesPath           = path.join( tmpProjectPath, 'assets', 'resources' ),
                spellEngineFile         = createDebugPath( debug, 'spell.debug.js', 'spell.release.js', path.join( spellCorePath, 'lib' ))


            console.log( '[spellcli] Cleaning ' + tmpProjectPath )
            emptyDirectory( tmpProjectPath )

            var f = ff(
                function() {
                    //Set timeout for prerequisite check to 5s
                    f.timeout( 10000 )
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
	                console.log( '[spellcli] cp -aR ' + tealeafPath + ' ' + tmpProjectPath )
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
	            function() {
		            console.log( '[spellcli] Patching Xcode project file ' + projectFile )
		            XcodeProjectHelper.updateIOSProjectFile( projectFile, iOSBundleId, f.wait() )
	            },
	            function() {
		            var title               = iOSBuildSettings.title            || projectId,
			            version             = iOSBuildSettings.version          || '1.0.0',
			            screenOrientation   = projectConfig.config.orientation  || 'auto-rotation'

			        console.log( '[spellcli] Patching plist file ' + plistFile )
		            XcodeProjectHelper.updatePListFile( plistFile, iOSBundleId, title, version, screenOrientation, f.wait() )
	            },
                function() {
                    console.log( '[spellcli] Writing config file ' + configFile )
                    XcodeProjectHelper.createConfigFile(
                        configFile,
                        {
                            remote_loading: 'false',
                            tcp_port: 4747,
                            code_port: 9201,
                            screen_width: 480,
                            screen_height: 800,
                            code_host: 'localhost',
                            entry_point: 'gc.native.launchClient',
                            app_id: "example.appid",
                            tcp_host: 'localhost',
                            source_dir: '/',
                            game_hash: "ios",
                            sdk_hash: "ios",
                            native_hash: "ios",
                            code_path: 'native.js',
                            studio_name: "example.studio",

                            apple_id: "example.appleid",
                            bundle_id: "example.bundle",
                            version: "1.0"
                        },
                        f.wait()
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