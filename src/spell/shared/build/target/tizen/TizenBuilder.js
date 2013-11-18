define(
	'spell/shared/build/target/tizen/TizenBuilder',
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

		'xmlbuilder',

		'spell/shared/build/target/web/WebBuilder',

		'spell/shared/build/external/tizen/web-packaging',
		'spell/shared/build/external/tizen/web-signing',

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
				unsignedDebugWgtFile    = path.join( tmpProjectPath, 'bin', projectId + '-debug-unsigned.wgt' ),
				unsignedReleaseWgtFile  = path.join( tmpProjectPath, 'bin', projectId + '-release-unsigned.wgt' )



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


					var root = xmlbuilder.create()

					var node = root.ele( 'widget', {
						'xmlns'         : 'http://www.w3.org/ns/widgets',
						'xmlns:tizen'   : 'http://tizen.org/ns/widgets',
						'id'            : 'http://kaisergames.com',
						'version'       : '1.0.1',
						'viewmodes'     : 'fullscreen'
					})
					.ele( 'tizen:application', {
						'id'                : 'M89SDclCRb.JungleChaos',
						'package'           : 'M89SDclCRb',
						'required_version'  : '2.2'

					})
					.up( )
					.ele( 'author' ).txt( 'Kaisergames' )
					.up( )
					.ele( 'content', {
						'src': 'index.html'
					})
					.up()
					.ele( 'icon', {
						'src': 'icon.png'
					})
					.up()
					.ele( 'name').txt( projectId ) //TODO: insert real name here
					.up()
					.ele('tizen:setting', {
						'screen-orientation'    :   'landscape', //portrait, auto-rotate
						'context-menu'          :   'enable',
						'background-support'    :   'disable',
						'encryption'            :   'disable',
						'install-location'      :   'auto',
						'hwkey-event'           :   'enable'
					})
					.up()

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
					//build wgt package
					var cwd = path.join( tmpProjectPath, 'web' )

					var argv = [
						'-n',
						'-o',
						debug ? unsignedDebugWgtFile : unsignedReleaseWgtFile,
						cwd
					]

					console.log( '[spellcli] web-package ' + argv.join(' ') )

					webPackaging.run( environmentConfig, argv, cwd,  f.wait() )
				},
				function() {
					if( !debug ) {
						var root = xmlbuilder.create()

						var node = root.ele( 'profiles' )
							.ele( 'profile', {
								'name': 'release'
							})
							.ele( 'profileitem', {
								'author'    : 'true',
								'ca'        : 'path/to/ca.cer',
								'key'       : 'path/to/key.p12',
								'password'  : '',
								'rootca'    : ''
							})


					}

						//create signing profile
					/*
					<?xml version="1.0" encoding="UTF-8"?>
						<profiles version="version">
							<profile name="test">
								<profileitem ca="C:\tizen-sdk\tools\certificate-generator\certificates\developer\tizen-developer-ca.cer"
								distributor="0"
								key="C:\tizen-sdk\tools\certificate-generator\test.p12"
								password="t2wTorkLaeg=" rootca=""/>
								<profileitem ca="C:\tizen-sdk\tools\certificate-generator\certificates\distributor\tizen-distributor-ca.cer"
								distributor="1"
								key="C:\tizen-sdk\tools\certificate-generator\certificates\distributor\tizen-distributor-signer.p12"
								password="Vy63flx5JBMc5GA4iEf8oFy+8aKE7FX/+arrDcO4I5k=" rootca=""/>
								<profileitem ca="" distributor="2" key="" password="xmEcrXPl1ss=" rootca=""/>
							</profile>
						</profiles>
					*/
				},
				function() {
					//sign wgt package
					var cwd = path.join( tmpProjectPath, 'web' )

					//var argv = [
					//		'--profile',
					//	'release:profiles.xml'
					//]
					//webSigning.run( environmentConfig, argv, cwd, f.wait() )
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