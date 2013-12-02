define(
	'spell/cli/build/external/android/jarsigner',
	[
		'spell/cli/build/external/java',

		'fs',
		'os',
		'path',
		'child_process',
		'spell/cli/util/spawnChildProcess'
	],
	function(
		java,

		fs,
		os,
		path,
		child_process,
		spawnChildProcess
		) {
		'use strict'

		var getJarsignerPath = function( environmentConfig ) {
			return path.join( environmentConfig.jdkPath, 'bin', 'jarsigner' + ( os.platform() == 'win32' ? '.exe': '' ) )
		}

		return {
			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				var jarsignerPath = getJarsignerPath( environmentConfig )

				if( !fs.existsSync( jarsignerPath ) ) {
					failCb( 'Could not find jarsigner (jdk) in ' + jarsignerPath )
					return
				}

				successCb()
			},

			run: function( environmentConfig, argv, cwd, next ) {
				spawnChildProcess(
					getJarsignerPath( environmentConfig ),
					argv,
					java.getProcessEnv( environmentConfig ),
					true,
					next
				)
			}
		}
	}
)
