define(
	'spell/cli/build/external/javac',
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

		var getJavacPath = function( environmentConfig ) {
			return path.join( environmentConfig.jdkPath, 'bin', 'javac' + ( os.platform() == 'win32' ? '.exe': '' ) )
		}

		return {
			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				var javacPath = getJavacPath( environmentConfig )

				if( !fs.existsSync( javacPath ) ) {
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
