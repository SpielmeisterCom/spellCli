define(
	'spell/cli/build/target/ios/iOSBuilder',
	[
		'spell/cli/build/createBuilderType',
		'spell/cli/build/createDataFileContent',
		'spell/cli/build/createDebugPath',
		'spell/cli/build/createProjectLibraryFilePaths',
		'spell/cli/util/emptyDirectory',
		'spell/cli/build/processSource',
		'spell/cli/build/loadAssociatedScriptModules',
		'spell/cli/util/writeFile',
		'spell/cli/util/spawnChildProcess',
		'spell/cli/util/createModuleId',
		'spell/cli/util/hashModuleId',

		'spell/cli/build/external/ios/xcodebuild',
		'spell/cli/build/external/ios/xcrun',
		'spell/cli/build/target/ios/XCodeProjectHelper',

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
	            version                 = projectConfig.config.version      || '1.0.0',
	            screenOrientation       = projectConfig.config.orientation  || 'auto-rotation',
	            iOSBuildSettings        = projectConfig.config.ios || {},
	            bundleId                = iOSBuildSettings.bundleId || 'com.spelljs.' + projectId,
	            openXcode               = iOSBuildSettings.openXcode || false,
                spellCorePath           = environmentConfig.spellCorePath,
				spelliOSPath            = environmentConfig.spelliOSPath || '../spelliOS/build',
                tmpProjectPath          = path.join( projectPath, 'build', 'tmp', 'ios', projectId ),

	            XcodeProjectPath        = path.join( tmpProjectPath, 'Ejecta.xcodeproj' ),
				projectFile             = path.join( XcodeProjectPath, 'project.pbxproj' ),
                appPath                 = path.join( tmpProjectPath, 'App'),

                resourcesPath           = path.join( tmpProjectPath, 'Resources'),
				plistFile               = path.join( resourcesPath, 'Info.plist'),

                configFile              = path.join( tmpProjectPath, 'resources', 'config.plist'),
                spellEngineFile         = createDebugPath( debug, 'spell.debug.js', 'spell.release.js', path.join( spellCorePath, 'lib' )),
                launchClientFile        = path.resolve( spelliOSPath, 'launchClient.js'),
	          //  appPath                 = path.join( tmpProjectPath, 'build', (debug ? 'Debug' : 'Release') + '-iphoneos', bundleId + '.app'),
	            ipaFile                 = path.join( tmpProjectPath, 'bin', projectId + '-' + (debug?'debug':'release') + '.ipa'),
	            provisionFile           = '',
	            developerName           = ''

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
	                console.log( '[spellcli] cp -aR ' + spelliOSPath + ' ' + tmpProjectPath )
                    wrench.copyDirSyncRecursive(
                        spelliOSPath,
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
		            XcodeProjectHelper.updateIOSProjectFile( projectFile, bundleId, f.wait() )
	            },
	            function() {
		            var title               = iOSBuildSettings.title            || projectId

			        console.log( '[spellcli] Patching plist file ' + plistFile )
		            XcodeProjectHelper.updatePListFile( plistFile, bundleId, title, version, screenOrientation, f.wait() )
	            },
	            function() {
		            console.log( '[spellcli] Copying icon resources into XCode project' )

		            var icons = [
                        'Icon.png',         /* 57x57    iOS6 iPhone App Icon */
                        'Icon-60.png',      /* 60x60    iOS7 iPhone App Icon */
                        'Icon-72.png',      /* 72x72    iOS6 iPad App Icon */
                        'Icon-76.png',      /* 76x76    iOS7 iPad App Icon */
                        'Icon@2x.png',      /* 114x114  iOS6 iPad App Icon for retina display */
                        'Icon-60@2x.png',   /* 120x120  iOS7 iPhone App Icon for retina display */
                        'Icon-72@2x.png',   /* 144x144  iOS6 iPhone App Icon for retina display */
                        'Icon-76@2x.png'    /* 152x152  iOS7 iPad App Icon for retina display */
                    ]

		            for( var i = 0; i< icons.length; i++ ) {
			            var fileName    = icons[ i ],
				            srcPath     = path.join( projectPath, 'resources', 'ios', fileName ),
				            dstPath     = path.join( resourcesPath, fileName )

			            if( fs.existsSync( srcPath ) ) {
				            fsUtil.copyFile(
					            srcPath,
					            dstPath
				            )
			            } else {
				            console.log( '[spellcli] WARN did not find icon ' + srcPath )
			            }
		            }
	            },
	            /*function() {
		            console.log( '[spellcli] Copying launchimage resources into XCode project' )

		            var splashes = [
			            { key: "portrait480", outFile: "Default.png", outSize: "320x480" },
			            { key: "portrait960", outFile: "Default@2x.png", outSize: "640x960"},
			            { key: "portrait1024", outFile: "Default-Portrait~ipad.png", outSize: "768x1024"},
			            { key: "portrait1136", outFile: "Default-568h@2x.png", outSize: "640x1136"},
			            { key: "portrait2048", outFile: "Default-Portrait@2x~ipad.png", outSize: "1536x2048"},
			            { key: "landscape768", outFile: "Default-Landscape~ipad.png", outSize: "1024x768"},
			            { key: "landscape1536", outFile: "Default-Landscape@2x~ipad.png", outSize: "2048x1536"}
		            ]

		            for( var i = 0; i< splashes.length; i++ ) {
			            var splash  = splashes[ i ],
				            srcPath = path.join( projectPath, 'resources', 'ios', 'launchimage', splash.outFile ),
				            dstPath = path.join( tmpProjectPath, 'Images.xcassets', 'LaunchImage.launchimage', splash.outFile)

			            if( fs.existsSync( srcPath ) ) {
				            fsUtil.copyFile(
					            srcPath,
					            dstPath
				            )
			            } else {
				            console.log( '[spellcli] WARN did not find launchimage ' + srcPath )
			            }

		            }
	            },*/
                /*function() {
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
                            bundle_id: bundleId,
                            version: version
                        },
                        f.wait()
                   )
                },*/
                function() {
                    console.log( '[spellcli] Populating ' + appPath + ' with SpellJS project resources' )

                    if( !fs.existsSync( appPath ) ) {
                        wrench.mkdirSyncRecursive( appPath )
                    }

                    // copy project library directory
                    var libraryResourcesPath = path.join( appPath, 'library' ),
                        spelljsResourcesPath = path.join( appPath, 'spelljs' )

/*                    fsUtil.copyFile(
                        launchClientFile,
                        path.join( appPath, 'native.js' )
                    )
*/
                    // create application module and engine library file
                    wrench.mkdirSyncRecursive( spelljsResourcesPath )

                    writeFile(
                        path.join( spelljsResourcesPath, 'data.js' ),
                        createDataFileContent( scriptSource, cacheContent, projectConfig )
                    )

                    fsUtil.copyFile(
                        spellEngineFile,
                        path.join( spelljsResourcesPath, 'spell.js' )
                    )

                    fsUtil.copyFiles(
                        projectLibraryPath,
                        libraryResourcesPath,
                        createProjectLibraryFilePaths( projectLibraryPath, true )
                    )
                },
                function () {
	                if( openXcode ) {
                        console.log( '[spellcli] Opening Xcode project in ' + XcodeProjectPath )

                        var child = child_process.exec('open ' + XcodeProjectPath + ' &',
							function (error, stdout, stderr) {
						})

	                } else {

		                var params = [
			                '-target',
			                bundleId,

			                '-sdk',
			                'iphoneos6.1',

			                '-configuration',
			                debug ? 'Debug' : 'Release',

			                '-jobs',
			                8
		                ]

		                console.log( '[spellcli] xcodebuild '  + params.join(' ') )
		                xcodebuild.run(
			                environmentConfig,
			                params,
			                tmpProjectPath,
			                f.wait()
		                )
	                }
            },
            function () {
	            if( !openXcode ) {
	                var params = [
	                     '-sdk', 'iphoneos',
	                     'PackageApplication',
	                     '-v',
		                appPath,
	                     '-o',
		                ipaFile,
	                     '--sign',
	                     'iPhone Developer: ' + developerName,
	                     '--embed',
		                provisionFile
                     ]

		            console.log( '[spellcli] xcrun '  + params.join(' ') )
                    xcrun.run(
	                    environmentConfig,
	                    params,
	                    tmpProjectPath,
	                    f.wait()
                    )
	            }
            }

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