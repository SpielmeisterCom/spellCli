define(
	'spell/shared/build/external/java',
	[
		'fs',
		'spell/shared/build/spawnChildProcess'
	],
	function(
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

			getProcessEnv: function( environmentConfig, cwd ) {
				return {
					cwd : cwd,
					env : { JAVA_HOME : environmentConfig.jdkPath }
				}
			},

			run: function( environmentConfig, argv, next, cwd ) {

				spawnChildProcess(
					'java',
					argv,
					javaChildProcessOptions,
					true,
					next
				)
			}
		}
	}
)
