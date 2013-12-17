define(
	'spell/cli/build/target/windows/WindowsPhoneBuilder',
	[
		'spell/cli/build/createBuilderType',
		'spell/cli/util/emptyDirectory',
		'spell/cli/util/spawnChildProcess',
		'spell/cli/util/writeFile',

		'xmlbuilder',

		'spell/cli/build/target/web/WebBuilder',

		'spell/cli/build/external/windows/msBuild',
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

		msBuild,
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
			var projectId           = projectConfig.config.projectId || 'defaultProjectId',
				tmpProjectPath      = path.join( projectPath, 'build', 'tmp', 'winphone'),
				outputPath          = path.join( outputPath, 'winphone'),
				skeletonProjectPath = environmentConfig.spellWindowsPhone8

			var f = ff(
				function() {
					console.log( '[spellcli] Checking prerequisite: MSBuild.exe' )
					msBuild.checkPrerequisite( environmentConfig, f.wait(), f.fail )
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
					console.log( '[spellcli] cp -aR ' + skeletonProjectPath + ' ' + tmpProjectPath )

					wrench.copyDirSyncRecursive(
						skeletonProjectPath,
						tmpProjectPath,
						{
							forceDelete: true,
							preserveFiles : false,
							inflateSymlinks : false
						}
					)
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
				},
				function() {
					var webBuildPath     = path.join( tmpProjectPath, 'web' ),
						spellProjectPath = path.join( tmpProjectPath, 'SpellJSProjectSceleton', 'Html' )

					console.log( '[spellcli] cp -aR ' + webBuildPath + ' ' + spellProjectPath )

					wrench.copyDirSyncRecursive(
						webBuildPath,
						spellProjectPath,
						{
							forceDelete: true,
							preserveFiles : false,
							inflateSymlinks : false
						}
					)

					console.log( '[spellcli] rm -R ' + webBuildPath )
					wrench.rmdirSyncRecursive( webBuildPath )
				},
				function() {
					var xamlFilePath = path.join( tmpProjectPath, 'SpellJSProjectSceleton', 'MainPage.xaml' ),
						orientation  = projectConfig.config.orientation == 'auto' ? 'PortraitOrLandscape' : projectConfig.config.orientation

					console.log( '[spellcli] Patch the '+ xamlFilePath +' file' )

					var fileContent = fs.readFileSync( xamlFilePath, 'utf-8' )

					fileContent = fileContent.replace( /PortraitOrLandscape/, orientation )

					writeFile(
						xamlFilePath,
						fileContent
					)
				},
				function() {
					var cwd = path.join( tmpProjectPath, 'SpellJSProjectSceleton.sln' )

					var argv = [
						cwd
					]

					console.log( '[spellcli] Build: ' + argv.join(' ') )

					msBuild.run( environmentConfig, argv, cwd, f.wait() )
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