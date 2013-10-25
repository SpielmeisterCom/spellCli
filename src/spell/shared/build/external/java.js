define(
	'spell/shared/build/external/java',
	[
		'fs',
		'os',
		'path',
		'child_process',
		'spell/shared/build/spawnChildProcess'
	],
	function(
		fs,
		os,
		path,
		child_process,
		spawnChildProcess
	) {
		'use strict'

		var getJavaPath = function( environmentConfig ) {
			return path.join( environmentConfig.jdkPath, 'bin', 'java' + ( os.platform() == 'win32' ? '.exe': '' ) )
		}

		var getProcessEnv = function( environmentConfig, cwd ) {
			return {
				cwd : cwd,
				env : {
					JAVA_HOME : environmentConfig.jdkPath
				}
			}
		}

		return {
			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				var javaPath = getJavaPath( environmentConfig )

				if( !fs.existsSync( javaPath ) ) {
					failCb( 'Could not find java (jre/jdk) in ' + javaPath )
					return
				}

				successCb()
			},

			getProcessEnv: getProcessEnv,

			run: function( environmentConfig, argv, cwd, next ) {
				spawnChildProcess(
					getJavaPath( environmentConfig ),
					argv,
					getProcessEnv( environmentConfig ),
					true,
					next
				)
			}
		}
	}
)
