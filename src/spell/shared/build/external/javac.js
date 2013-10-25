define(
	'spell/shared/build/external/javac',
	[
		'spell/shared/build/external/java',

		'fs',
		'spell/shared/build/spawnChildProcess'
	],
	function(
		java,
		fs,
		spawnChildProcess
		) {
		'use strict'

		var getJavaPath = function() {
			//jdkPath          = environmentConfig.jdkPath,
		}

		return {
			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				successCb();
			},

			run: function( environmentConfig, argv, cwd, next ) {

				spawnChildProcess(
					'javac',
					argv,
					java.getProcessEnv( environmentConfig, cwd ),
					true,
					next
				)
			}
		}
	}
)
