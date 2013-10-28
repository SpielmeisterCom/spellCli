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
					JAVA_HOME : environmentConfig.jdkPath,
					PATH: process.env.PATH + path.delimiter + '"' + path.join( environmentConfig.jdkPath, 'bin' ) + '"'
				}
			}
		}

		return {
			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				var javaPath = getJavaPath( environmentConfig )

				if( !fs.existsSync( javaPath ) ) {
					failCb(
						"\r\n" +
						"Could not find an installed Java Development Kit (JDK)\r\n\r\n" +
						"The current jdkPath is: " + environmentConfig.jdkPath + "\r\n\r\n" +
						"Please download and install a recent JDK from\r\n\r\n" +
						"  http://www.oracle.com/technetwork/java/javase/downloads/jdk7-downloads-1880260.html\r\n\r\n" +
						"Also check that the path to the JDK is set correctly to your JAVA_HOME in the spellConfig.json (or via SpellEd)\r\n"
					)


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
