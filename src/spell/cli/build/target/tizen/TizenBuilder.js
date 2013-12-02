define(
	'spell/cli/build/target/tizen/TizenBuilder',
	[
		'spell/cli/build/createBuilderType',
		'spell/cli/build/createDataFileContent',
		'spell/cli/build/createDebugPath',
		'spell/cli/build/createProjectLibraryFilePaths',
		'spell/cli/build/emptyDirectory',
		'spell/cli/build/processSource',
		'spell/cli/build/loadAssociatedScriptModules',
		'spell/cli/build/writeFile',
		'spell/cli/build/spawnChildProcess',
		'spell/cli/util/createModuleId',
		'spell/cli/util/hashModuleId',

		'xmlbuilder',

		'spell/cli/build/target/web/WebBuilder',

		'spell/cli/build/external/tizen/web-packaging',
		'spell/cli/build/external/tizen/web-signing',

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

		xmlbuilder,

		WebBuilder,

		webPackaging,
		webSigning,

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
				tmpProjectPath          = path.join( projectPath, 'build', 'tmp', 'tizen'),
				unsignedDebugWgtFile    = path.join( tmpProjectPath, projectId + '_debug_unsigned.wgt' ),
				signedReleaseWgtFile    = path.join( tmpProjectPath, projectId + '_release_signed.wgt'),
				tizenOutputPath         = path.join( outputPath, 'tizen' ),
				tizenBuildSettings      = projectConfig.config.tizen || {}


			var f = ff(
				function() {
					//Set timeout for prerequisite check to 5s
					f.timeout( 5000 )
				},
				function() {
					console.log( '[spellcli] Checking prerequisite: web-packaging' )
					webPackaging.checkPrerequisite( environmentConfig, f.wait(), f.fail )
				},
				function() {
					console.log( '[spellcli] Checking prerequisite: web-signing' )
					webSigning.checkPrerequisite( environmentConfig, f.wait(), f.fail )
				},
				function() {
					console.log( '[spellcli] Cleaning ' + tmpProjectPath )
					emptyDirectory( tmpProjectPath )
				},
				function() {
					console.log( '[spellcli] Cleaning ' + tizenOutputPath )
					emptyDirectory( tizenOutputPath )
				},
				function() {
					//Set timeout to 5 min
					f.timeout( 5 * 60 * 1000 )
				},
				function() {
					console.log( '[spellcli] Creating web build for the tizen package' )

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
					console.log( '[spellcli] writing tizen config file' )

					var features = [
						'http://tizen.org/feature/screen.size.normal.720.1280',
						'http://tizen.org/feature/screen.size.normal.480,800'
					]

					var privileges = [
						'http://tizen.org/privilege/application.launch' //needed for openURL
					]

					var appId               = tizenBuildSettings.appId || 'M89SDclCRb.' + projectId ,
						version             = projectConfig.config.version || '1.0.0',
						name                = tizenBuildSettings.name || projectId,
						screenOrientation   = projectConfig.config.orientation || 'auto-rotation',
						identifier          = tizenBuildSettings.identifier || 'http://spelljs.com/' + projectId,
						authorName          = '',
						authorEmail         = '',
						authorHref          = '',
						description         = '',
						licenseName         = '',
						licenseHref         = ''



					var root = xmlbuilder.create()

					var node = root.ele( 'widget', {
						'xmlns'         : 'http://www.w3.org/ns/widgets',
						'xmlns:tizen'   : 'http://tizen.org/ns/widgets',
						'id'            : identifier,
						'version'       : version,
						'viewmodes'     : 'fullscreen'
					})

					.ele( 'tizen:application', {
						'id'                : appId,
						'package'           : appId.split('.')[ 0 ],
						'required_version'  : '2.2'

					})
					.up( )

					.ele( 'content', {
						'src': 'index.html'
					})
					.up()

					.ele( 'icon', {
						'src': 'icon.png'
					})
					.up()

					.ele( 'name').txt( name )
					.up()

					.ele('tizen:setting', {
						//Optional; viewport orientation lock (available values: portrait (default), landscape), auto-rotation
						//If the system auto rotation setting is on, the Web application viewport orientation is changed accordingly by default.
						'screen-orientation'    :   screenOrientation,

						//Optional; context menu is displayed when the user clicks, for example, an image, text, or link (available values: enable (default), disable)
						'context-menu'          :   'enable',

						//Optional; application execution continues when it is moved to the background (available values enable, disable (default))
						'background-support'    :   'disable',

						//Optional; Web application resources (HTML, JavaScript, and CSS files) are stored encrypted (available values: enable, disable (default))
						'encryption'            :   'disable',

						//Optional; application installation location (available values: auto (default), internal-only, prefer-external)
						'install-location'      :   'auto',

						//Optional; a hardware key event is sent to the Web application when the user presses the hardware key (available values: enable (default), disable)
						//If this option is enabled, the tizenhwkey custom event is sent to the Web application. The tizenhwkey event object has a keyName attribute
						//(available values: menu and back).
						'hwkey-event'           :   'enable'
					})
					.up()

					if( authorName ) {
						node = node.ele( 'author', {
							'href': authorHref,
							'email': authorEmail
						} ).txt( authorName )
						.up( )
					}

					if( description ) {
						node = node.ele( 'description' ).txt( description )
						.up( )
					}

					if( licenseName ) {
						node = node.ele( 'license', {
							'href': licenseHref
						} ).txt( licenseName )
						.up( )
					}

					features.forEach( function( featureName ) {
						node.ele( 'feature', {
							'name': featureName
						})
					} )

					privileges.forEach( function( privilegeName ) {
						node.ele( 'tizen:privilege', {
							'name': privilegeName
						})
					} )


					var xmlContent = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
						xmlContent += root.toString( { pretty : true } )

					fs.writeFileSync( path.join( tmpProjectPath, 'web', 'config.xml'), xmlContent )

				},
				function() {
					//Copy icon
					var srcPath = path.join( projectPath, 'resources', 'tizen', 'icon.png' ),
						dstPath = path.join( tmpProjectPath, 'web', 'icon.png')

					if( fs.existsSync( srcPath ) ) {
						console.log( '[spellcli] cp ' + srcPath + ' ' + dstPath )
						fsUtil.copyFile( srcPath, dstPath )

					} else {
						console.log( '[spellcli] WARN did not find icon in ' + srcPath )
					}
				},
				function() {
					if( !debug ) {
						var root = xmlbuilder.create()

						var node = root.ele( 'profiles', {
								'version': '2.2'
							} )
							.ele( 'profile', {
								'name': 'release'
							})
							.ele( 'profileitem', {
								'ca'            : '/home/julian/tizen-sdk/tools/certificate-generator/certificates/developer/tizen-developer-ca.cer',
								'distributor'   : '0',
								'key'           : '/srv/tizen-sdk-data/keystore/author/kaisergames.p12',
								'password'      : 'gKlviz/O6bC8ovlo/PRRlw==',
								'rootca'        : ''
							})
							.up( )
							.ele( 'profileitem', {
								'ca'            : '/home/julian/tizen-sdk/tools/certificate-generator/certificates/distributor/tizen-distributor-ca.cer',
								'distributor'   : '1',
								'key'           : '/home/julian/tizen-sdk/tools/certificate-generator/certificates/distributor/tizen-distributor-signer.p12',
								'password'      : 'Vy63flx5JBMc5GA4iEf8oFy+8aKE7FX/+arrDcO4I5k=',
								'rootca'        : ''
							})
							.up( )
							.ele( 'profileitem', {
								'ca'            : '',
								'distributor'   : '2',
								'key'           : '',
								'password'      : 'xmEcrXPl1ss',
								'rootca'        : ''
							})


						var xmlContent = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
						xmlContent += root.toString( { pretty : true } )

						fs.writeFileSync( path.join( tmpProjectPath, 'profiles.xml'), xmlContent )
					}

				},
				function() {
					if( !debug ) {

						//sign wgt package
						var cwd             = path.join( tmpProjectPath, 'web'),
							profilesPath    = path.join( tmpProjectPath, 'profiles.xml')

						var argv = [
							'--log',
							'info',
							'--nocheck',
							'--profile',
							'release:' + profilesPath,
							cwd
						]

						console.log( '[spellcli] web-signing ' + argv.join(' ') )

						webSigning.run(
							environmentConfig,
							argv,
							cwd,
							f.wait()
						)
					}
				},
				function() {
					//build wgt package
					var cwd = path.join( tmpProjectPath, 'web' )

					var argv = [
						'-n',
						'-o',
						debug ? unsignedDebugWgtFile : signedReleaseWgtFile,
						cwd
					]

					console.log( '[spellcli] web-packaging ' + argv.join(' ') )

					webPackaging.run( environmentConfig, argv, cwd,  f.wait() )
				},
				function() {
					var wgtFile = debug ? unsignedDebugWgtFile : signedReleaseWgtFile

					var outputFile  = path.join( tizenOutputPath, path.basename( wgtFile ) )

					console.log( '[spellcli] cp ' + wgtFile + ' ' + outputFile )

					fsUtil.copyFile( wgtFile, outputFile )
				}

			).onError( function( message ) {
				console.log( message )
			})
		}

		var TARGET_NAME     = 'tizen',
			TizenBuilder    = createBuilderType()

		TizenBuilder.prototype = {
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

		return TizenBuilder
	}
)