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
			var projectId             = projectConfig.config.projectId || 'defaultProjectId',
				tmpProjectPath        = path.join( projectPath, 'build', 'tmp', 'winphone'),
				outputPath            = path.join( outputPath, 'winphone'),
				skeletonProjectPath   = environmentConfig.spellWindowsPhone8,
				buildTarget           = debug ? 'Debug' : 'Release',
				winphoneBuildSettings = projectConfig.config.winphone,
				displayName           = winphoneBuildSettings.displayName,
				iconPath              = "Assets\\ApplicationIcon.png",
				smallIcon             = "Assets\\Tiles\\FlipCycleTileSmall.png",
				mediumIcon            = "Assets\\Tiles\\FlipCycleTileMedium.png"

			var f = ff(
				function() {
					console.log( '[spellcli] Checking prerequisite: MSBuild.exe' )
					msBuild.checkPrerequisite( environmentConfig, f.wait(), f.fail )
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
					console.log( '[spellcli] writing WMAppManifest file' )

					var version              = projectConfig.config.version || '1.0.0.0',
						language             = projectConfig.config.defaultLanguage || "en-us",
						description          = winphoneBuildSettings.description || 'A Windows Store App created with SpellJS',
						author               = winphoneBuildSettings.author,
						publisher            = winphoneBuildSettings.publisher

					var root = xmlbuilder.create()

					var node = root.ele( 'Deployment', { xmlns: 'http://schemas.microsoft.com/windowsphone/2012/deployment', AppPlatformVersion: "8.0"})
						.ele( 'DefaultLanguage', { xmlns: "", code: language } ).up().ele( 'Languages', { xmlns: "" } )

					_.each(
						projectConfig.config.supportedLanguages,
						function( supportedLanguage ) {	node.ele( "Language", { code: supportedLanguage} ) }
					)

					node.up()
						.ele( 'App',{
							xmlns: "",
							ProductID: "{9cc34fff-f4f8-44ad-9d67-367c2c2a0936}",
							Title: displayName,
							RuntimeType: "Silverlight",
							Version: version,
							Genre: "apps.normal",
							Author: author,
							Description: description,
							Publisher: publisher,
							PublisherID: "{123f91e3-8000-4af5-9465-bfb807d8fc9b}"
						})
						.ele( 'IconPath', { IsRelative: true, IsResource: false } ).txt( iconPath ).up()
						.ele( 'Capabilities' )
							.ele( 'Capability', { Name: 'ID_CAP_NETWORKING' }).up()
							.ele( 'Capability', { Name: 'ID_CAP_SENSORS' }).up()
							.ele( 'Capability', { Name: 'ID_CAP_WEBBROWSERCOMPONENT' }).up()
						.up()
						.ele( 'Tasks' )
							.ele( 'DefaultTask', { Name: "_default", NavigationPage: "MainPage.xaml" }).up().up()
						.ele( 'Tokens' )
							.ele( 'PrimaryToken', { TokenID: displayName + 'Token', TaskName: "_default" })
								.ele( 'TemplateFlip' )
									.ele( 'SmallImageURI', { IsRelative: true, IsResource: false } ).txt( smallIcon ).up()
									.ele( 'Count').txt(0).up()
									.ele( 'BackgroundImageURI', { IsRelative: true, IsResource: false } ).txt( mediumIcon ).up()
									.ele( 'Title').txt(displayName).up()
									.ele( 'BackContent').up()
									.ele( 'BackBackgroundImageURI').up()
									.ele( 'BackTitle').up()
									.ele( 'DeviceLockImageURI').up()
									.ele( 'HasLarge').up()
								.up()
							.up()
						.up()
						.ele( 'ScreenResolutions' )
							.ele( 'ScreenResolution', { Name: 'ID_RESOLUTION_WVGA' }).up()
							.ele( 'ScreenResolution', { Name: 'ID_RESOLUTION_WXGA' } ).up()
							.ele( 'ScreenResolution', { Name: 'ID_RESOLUTION_HD720P' } ).up()

					var xmlContent = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
					xmlContent += root.toString( { pretty : true } )

					writeFile( path.join( tmpProjectPath, 'SpellJSProjectSceleton', 'Properties', 'WMAppManifest.xml'), xmlContent )
				},
				function() {
					console.log( '[spellcli] Copy images' )

					var resourcesPath = path.join( projectPath, 'resources', 'winphone'),
						assetsPath    = path.join( tmpProjectPath, 'SpellJSProjectSceleton' )

					fsUtil.copyFile( path.join( resourcesPath, 'ApplicationIcon.png' ) , path.join( assetsPath, iconPath ) )
					fsUtil.copyFile( path.join( resourcesPath, 'FlipCycleTileSmall.png' ) , path.join( assetsPath, smallIcon ) )
					fsUtil.copyFile( path.join( resourcesPath, 'FlipCycleTileMedium.png' ) , path.join( assetsPath, mediumIcon ) )
				},
				function() {
					var cwd = path.join( tmpProjectPath, 'SpellJSProjectSceleton.sln' )

					var argv = [
						cwd,
						'/property:Configuration=' + buildTarget
					]

					console.log( '[spellcli] Build: ' + argv.join(' ') )

					msBuild.run( environmentConfig, argv, cwd, f.wait() )
				},
				function() {
					var xapFilePath = path.join( tmpProjectPath, 'SpellJSProjectSceleton', 'bin', buildTarget, 'SpellJSProjectSceleton_' + buildTarget + '_AnyCPU.xap'),
						targetPath  = path.join( outputPath, path.basename( xapFilePath ) )

					console.log( '[spellcli] Copy XAP file to: ' + targetPath )

					fsUtil.copyFile( xapFilePath, targetPath )
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