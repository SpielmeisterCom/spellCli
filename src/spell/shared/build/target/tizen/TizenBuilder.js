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

					builder.build( f.wait() )

				},
				function() {
					//build wgt package
					var cwd = path.resolve( tmpProjectPath, 'web' )

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
					//sign wgt package

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