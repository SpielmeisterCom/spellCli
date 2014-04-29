define(
	'spell/cli/build/target/windows/WindowsPhoneBuilder',
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
                tmpProjectPath          = path.join( projectPath, 'build', 'tmp', 'winphone'),
                windowsOutputPath       = path.join( outputPath, 'winphone' ),
                appxFile                = path.join( windowsOutputPath, projectId + '_phone.appx' ),
                windowsBuildSettings    = projectConfig.config.winstore || {},
                windowsPhoneSettings    = projectConfig.config.winphone || {}

            var copyFile = function( fileName, targetName ) {
                //Copy icons
                var srcPath = path.join( projectPath, 'resources', 'winstore', fileName ),
                    dstPath = path.join( tmpProjectPath, 'web', 'images', targetName )

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
                    console.log( '[spellcli] Creating web build for the Windows Store Phone package' )

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
                        foregroundText       = windowsBuildSettings.foregroundText,
                        backgroundColor      = '#' + windowsBuildSettings.backgroundColor,
                        splashScreen         = "images\\SplashScreen.scale-100.png",
                        Square150x150Logo    = 'images\\Square150x150Logo.scale-100.png',
                        Square44x44Logo      = 'images\\Square44x44Logo.scale-100.png',
                        Square71x71Logo      = 'images\\Square71x71Logo.scale-100.png',
                        storeLogo            = 'images\\storelogo.png'

                    var root = xmlbuilder.create()

                    var node = root.ele( 'Package', {
                        'xmlns'         : 'http://schemas.microsoft.com/appx/2010/manifest',
                        'xmlns:m2'      : 'http://schemas.microsoft.com/appx/2013/manifest',
                        'xmlns:m3'      : "http://schemas.microsoft.com/appx/2014/manifest",
                        'xmlns:mp'      : "http://schemas.microsoft.com/appx/2014/phone/manifest"
                    })

                        .ele( 'Identity', {
                            'Name'      : packageName,
                            'Version'   : version,
                            'Publisher' : publisher

                        }).up()
                        .ele( 'mp:PhoneIdentity', {
                            'PhoneProductId': windowsPhoneSettings.PhoneProductId,
                            'PhonePublisherId': windowsPhoneSettings.PhonePublisherId
                        }).up()
                        .ele( 'Properties' )
                            .ele( 'DisplayName' ).txt( packageDisplayName ).up()
                            .ele( 'PublisherDisplayName' ).txt( publisherDisplayName).up()
                            .ele( 'Logo' ).txt( storeLogo ).up()
                        .up()
                        .ele( 'Prerequisites' )
                            .ele( 'OSMinVersion' ).txt( '6.3.1' ).up()
                            .ele( 'OSMaxVersionTested' ).txt( '6.3.1' ).up()
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
                        .ele( 'm3:VisualElements', {
                            DisplayName: displayName,
                            Square150x150Logo: Square150x150Logo,
                            Square44x44Logo: Square44x44Logo,
                            Description: description,
                            ForegroundText: foregroundText,
                            BackgroundColor: backgroundColor
                        } )
                        .ele( 'm3:DefaultTile', {
                            Square71x71Logo: Square71x71Logo
                        }).up()
                        .ele( 'm3:SplashScreen', {
                            Image: splashScreen
                        }).up()

                    if( screenOrientation != 'auto-rotation' ) {
                        node.ele( 'm3:InitialRotationPreference').ele( 'm3:Rotation', { Preference: screenOrientation } )
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
                    copyFile( path.join( 'phone', 'SplashScreen.scale-100.png' ), 'SplashScreen.scale-100.png' )
                    copyFile( path.join( 'phone', 'Square150x150Logo.scale-100.png' ), 'Square150x150Logo.scale-100.png' )
                    copyFile( path.join( 'phone', 'Square44x44Logo.scale-100.png' ), 'Square44x44Logo.scale-100.png' )
                    copyFile( path.join( 'phone', 'Square71x71Logo.scale-100.png' ), 'Square71x71Logo.scale-100.png' )
                    copyFile( path.join( 'phone', 'storelogo.png' ), 'storelogo.png' )
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