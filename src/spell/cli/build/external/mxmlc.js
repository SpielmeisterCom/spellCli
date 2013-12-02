define(
	'spell/cli/build/external/mxmlc',
	[
		'spell/cli/build/external/java',

		'fs',
		'path',
		'os',
		'spell/cli/spawnChildProcess'
	],
	function(
		java,

		fs,
		path,
		os,
		spawnChildProcess
		) {
		'use strict'


		var getCompilerExecutablePath = function( environmentConfig ) {
			var spellFlashPath           = environmentConfig.spellFlashPath,
				flexSdkPath              = path.join( spellFlashPath, 'vendor', 'flex_sdk' ),
				compilerExecutablePath   = path.join( flexSdkPath, 'bin', os.platform() == 'win32' ? 'mxmlc.bat' : 'mxmlc')

			return compilerExecutablePath
		}

		return {
			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				if( !fs.existsSync( getCompilerExecutablePath( environmentConfig ) ) ) {
					failCb( 'Could not find mxmlc compiler. Please make sure that spellFlash is included in the build.' )
					return
				}

				successCb()
			},

			run: function( environmentConfig, argv, cwd, next ) {

				spawnChildProcess(
					getCompilerExecutablePath( environmentConfig ),
					argv,
					java.getProcessEnv( environmentConfig, cwd ),
					true,
					next
				)
			}
		}
	}
)
