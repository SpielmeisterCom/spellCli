define(
	'spell/cli/build/target/windows/WindowsPhoneBuilder',
	[
		'spell/cli/build/createBuilderType',
		'spell/cli/util/emptyDirectory',
		'spell/cli/util/spawnChildProcess',
		'spell/cli/util/writeFile',

		'xmlbuilder',

		'spell/cli/build/target/web/WebBuilder',

		'spell/cli/build/external/windows/appPackager',
		'spell/cli/build/external/windows/signing',

		'ff',
		'fs',
		'fsUtil',
		'path',
		'pathUtil',
		'wrench'
	],
	function(
		createBuilderType,
		emptyDirectory,
		spawnChildProcess,
		writeFile,

		xmlbuilder,

		WebBuilder,

		appPackager,
		signing,

		ff,
		fs,
		fsUtil,
		path,
		pathUtil,
		wrench
		)
	{
		'use strict'


		var convertToWaveFilePath = function(filePath ) {
			var srcParts = filePath.split( '.' )

			srcParts.pop()
			srcParts.push( 'wav' )

			return srcParts.join( '.' )
		}

		var build = function( environmentConfig, projectPath, projectLibraryPath, outputPath, target, projectConfig, library, cacheContent, scriptSource, minify, anonymizeModuleIds, debug, next ) {
			var projectId      = projectConfig.config.projectId || 'defaultProjectId',
				tmpProjectPath = path.join( projectPath, 'build', 'tmp', 'winphone'),
				outputPath     = path.join( outputPath, 'winphone' )

			var f = ff(
				function() {
					console.log( '[spellcli] Checking prerequisite: MakeAppx.exe' )
					appPackager.checkPrerequisite( environmentConfig, f.wait(), f.fail )
				},
				function() {
					console.log( '[spellcli] Checking prerequisite: SignTool.exe' )
					signing.checkPrerequisite( environmentConfig, f.wait(), f.fail )
				},
				function() {
					console.log( '[spellcli] Cleaning ' + tmpProjectPath )
					emptyDirectory( tmpProjectPath )
				},
				function() {
					console.log( '[spellcli] Cleaning ' + outputPath )
					emptyDirectory( outputPath )
				},
				function() {
					console.log( '[spellcli] Creating web build for the Windows Phone package' )

					var builder = new WebBuilder(
						environmentConfig,
						projectPath,
						projectLibraryPath,
						tmpProjectPath,
						'html5',
						projectConfig,
						library,
						cacheContent,
						scriptSource,
						minify,
						anonymizeModuleIds,
						debug
					)

					builder.init()
					builder.build( f.wait() )

				},
				function() {
					console.log( '[spellcli] Creating wav files from ogg' )
					var files = pathUtil.createFilePathsFromDirSync( projectLibraryPath, ['ogg'] )


					_.each(
						files,
						function( relativeFilePath ) {
							var filePath = path.join( projectLibraryPath, relativeFilePath),
								wavPath  = path.join( tmpProjectPath, 'web', 'library' , convertToWaveFilePath( relativeFilePath ))

							wrench.mkdirSyncRecursive( path.dirname(wavPath) )

							spawnChildProcess(
								'sox',
								[
									filePath.replace( /\\/g, '/' ),
									wavPath.replace( /\\/g, '/' )
								],
								null,
								false,
								function() {}
							)
						}
					)
				}
			).onError( function( message ) {
				console.log( message )
			})
		}

		var TARGET_NAME         = 'winphone',
			WindowsPhoneBuilder = createBuilderType()

		WindowsPhoneBuilder.prototype = {
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

		return WindowsPhoneBuilder
	}
)