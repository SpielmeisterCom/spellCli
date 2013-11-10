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
			var spellCorePath           = environmentConfig.spellCorePath,
				spellAndroidPath        = environmentConfig.spelliOSPath,
				iOSBuildSettings        = projectConfig.config.ios || {}


			var f = ff(
				function() {
					//Set timeout for prerequisite check to 5s
					f.timeout( 5000 )
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
					xcodebuild.getInstalledSdks( environmentConfig, f.slot(), f.fail )
				},
				function( SDKs ) {
					console.log( SDKs )
				},

				//build app
				function () {
					var configurationName = debug ? 'Debug' : 'Release',
						sdk = 'iphoneos6.1'

					var params = [
						'-target',
						iOSBuildSettings.bundleID,
						'-sdk',
						sdk,
						'-configuration',
						configurationName,
						'-jobs',
						8
					]

					//xcodebuild.run( environmentConfig, params, '', f.wait() )

				},


				//sign app
				function () {
					/*var args = [
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
					]*/

					//xcrun.run( environmentConfig, params, '', f.wait() )

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