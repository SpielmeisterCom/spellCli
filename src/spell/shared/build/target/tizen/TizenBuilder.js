define(
	'spell/shared/build/target/ios/TizenBuilder',
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


			console.log('Building tizen')

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

		return
	}
)