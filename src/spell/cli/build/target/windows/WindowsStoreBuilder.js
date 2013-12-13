define(
	'spell/cli/build/target/windows/WindowsStoreBuilder',
	[
		'spell/cli/build/createBuilderType',
		'spell/cli/util/emptyDirectory',
		'spell/cli/util/writeFile',

		'xmlbuilder',

		'spell/cli/build/target/web/WebBuilder',

		'spell/cli/build/external/windows/appPackager',
		'spell/cli/build/external/windows/signing',

		'ff',
		'fs',
		'fsUtil',
		'path'
	],
	function(
		createBuilderType,
		emptyDirectory,
		writeFile,

		xmlbuilder,

		WebBuilder,

		appPackager,
		signing,

		ff,
		fs,
		fsUtil,
		path
		)
	{
		'use strict'

		var build = function( environmentConfig, projectPath, projectLibraryPath, outputPath, target, projectConfig, library, cacheContent, scriptSource, minify, anonymizeModuleIds, debug, next ) {
			var projectId               = projectConfig.config.projectId || 'defaultProjectId',
				tmpProjectPath          = path.join( projectPath, 'build', 'tmp', 'winstore'),
				windowsOutputPath       = path.join( outputPath, 'winstore' ),
				appxFile                = path.join( windowsOutputPath, projectId + '.appx' ),
				windowsBuildSettings    = projectConfig.config.winstore || {}

			var copyFile = function( fileName ) {
				//Copy icons
				var srcPath = path.join( projectPath, 'resources', 'winstore', fileName ),
					dstPath = path.join( tmpProjectPath, 'web', 'images', fileName )

				if( fs.existsSync( srcPath ) ) {
					console.log( '[spellcli] cp ' + srcPath + ' ' + dstPath )
					fsUtil.copyFile( srcPath, dstPath )

				} else {
					console.log( '[spellcli] WARN did not find icon in ' + srcPath )
				}
			}

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
					console.log( '[spellcli] Cleaning ' + windowsOutputPath )
					emptyDirectory( windowsOutputPath )
				},
				function() {
					console.log( '[spellcli] Creating web build for the Windows Store package' )

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

				},function() {
					console.log( '[spellcli] writing AppxManifest file' )

					var packageName          = projectId.replace( "_", '' ) ,
						version              = projectConfig.config.version || '1.0.0.0',
						packageDisplayName   = windowsBuildSettings.packageDisplayName || packageName,
						screenOrientation    = projectConfig.config.orientation || 'auto-rotation',
						startPage            = 'index.html',
						language             = '' || "en-us",
						displayName          = windowsBuildSettings.displayName,
						description          = windowsBuildSettings.description || 'A Windows Store App created with SpellJS',
						publisherDisplayName = windowsBuildSettings.publisherDisplayName,
						publisher            = windowsBuildSettings.publisher,
						storeLogo            = 'images\\storelogo.png',
						logo                 = 'images\\logo.png',
						smallLogo            = 'images\\smallLogo.png',
						foregroundText       = windowsBuildSettings.foregroundText,
						backgroundColor      = '#' + windowsBuildSettings.backgroundColor,
						splashScreen         = "images\\splash.png"

					var root = xmlbuilder.create()

					var node = root.ele( 'Package', {
						'xmlns'         : 'http://schemas.microsoft.com/appx/2010/manifest'
						})

						.ele( 'Identity', {
							'Name'      : packageName,
							'Version'   : version,
							'Publisher' : publisher

						}).up()
						.ele( 'Properties' )
						.ele( 'DisplayName' ).txt( packageDisplayName ).up()
						.ele( 'PublisherDisplayName' ).txt( publisherDisplayName).up()
						.ele( 'Logo' ).txt( storeLogo ).up()
						.up()
						.ele( 'Prerequisites' )
						.ele( 'OSMinVersion' ).txt( '6.2.1' ).up()
						.ele( 'OSMaxVersionTested' ).txt( '6.2.1' ).up()
						.up()
						.ele( 'Resources' )
						.ele( 'Resource', {
							'Language': language
						}).up()
						.up()
						.ele( 'Applications' )
						.ele( 'Application', {
							Id: packageName,
							StartPage: startPage
						} )
						.ele( 'VisualElements', {
							DisplayName: displayName,
							Description: description,
							Logo: logo,
							SmallLogo: smallLogo,
							ForegroundText: foregroundText,
							BackgroundColor: backgroundColor
						} )
						.ele( 'SplashScreen', {
							Image: splashScreen
						}).up()

					if( screenOrientation != 'auto-rotation' ) {
						node.ele( 'InitialRotationPreference').ele( 'Rotation', { Preference: screenOrientation } )
					}

					node.up().up().up()
						.ele( 'Capabilities' )
						.ele( 'Capability', {
							Name: 'internetClient'
						})

					var xmlContent = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
					xmlContent += root.toString( { pretty : true } )

					writeFile( path.join( tmpProjectPath, 'web', 'AppxManifest.xml'), xmlContent )
				},function() {
					//Copy icons
					fs.mkdirSync( path.join( tmpProjectPath, 'web', 'images' ) )
					copyFile( 'logo.png' )
					copyFile( 'smallLogo.png' )
					copyFile( 'splash.png' )
					copyFile( 'storelogo.png' )
				},
				function() {
					var cwd = path.join( tmpProjectPath, 'web' )

					var argv = [
						'pack',
						'/o',
						'/d',
						cwd,
						'/p',
						appxFile
					]

					console.log( '[spellcli] Pack: ' + argv.join(' ') )

					appPackager.run( environmentConfig, argv, cwd,  f.wait() )
				},
				function() {
					var cwd                 = path.join( tmpProjectPath, 'web' ),
						certificatePath     = path.join( projectPath, 'resources', 'winstore', 'certificates','windows-store.pfx' ),
						certificatePassword = windowsBuildSettings.signing.certificatePassword

					var argv = [
						'sign',
						'/a',
						'/v',
						'/fd',
						'SHA256',
						'/p',
						certificatePassword,
						'/f',
						certificatePath,
						appxFile
					]

					console.log( '[spellcli] Sign: ' + argv.join(' ') )

					signing.run( environmentConfig, argv, cwd,  f.wait() )
				}
			).onError( function( message ) {
				console.log( message )
			})
		}

		var TARGET_NAME         = 'winstore',
			WindowsStoreBuilder = createBuilderType()

		WindowsStoreBuilder.prototype = {
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

		return WindowsStoreBuilder
	}
)