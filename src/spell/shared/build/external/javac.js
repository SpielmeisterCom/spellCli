define(
	'spell/shared/build/external/javac',
	[
		'spell/shared/build/external/java',

		'fs',
		'os',
		'path',
		'child_process',
		'spell/shared/build/spawnChildProcess'
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

		var getJavacPath = function( environmentConfig ) {
			return path.join( environmentConfig.jdkPath, 'bin', 'javac' + ( os.platform() == 'win32' ? '.exe': '' ) )
		}

		return {
			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				var javacPath = getJavacPath( environmentConfig )

				if( !fs.existsSync( javacPath ) ) {
					failCb( 'Could not find javac (jdk) in ' + javacPath )
					return
				}

				successCb()
			},

			run: function( environmentConfig, argv, cwd, next ) {
				spawnChildProcess(
					getJavacPath( environmentConfig ),
					argv,
					java.getProcessEnv( environmentConfig ),
					true,
					next
				)
			}
		}
	}
)
