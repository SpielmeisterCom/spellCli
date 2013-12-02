define(
	'spell/cli/cert/external/keytool',
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

		var getKeytoolPath = function( environmentConfig ) {
			return path.join( environmentConfig.jdkPath, 'bin', 'keytool' + ( os.platform() == 'win32' ? '.exe': '' ) )
		}

		return {
			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				var keytoolPath = getKeytoolPath( environmentConfig )

				if( !fs.existsSync( keytoolPath ) ) {
					failCb( 'Could not find keytool (jdk) in ' + keytoolPath )
					return
				}

				successCb()
			},

			run: function( environmentConfig, argv, cwd, next ) {
				spawnChildProcess(
					getKeytoolPath( environmentConfig ),
					argv,
					java.getProcessEnv( environmentConfig ),
					true,
					next
				)
			}
		}
	}
)
