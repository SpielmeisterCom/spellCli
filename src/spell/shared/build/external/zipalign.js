define(
	'spell/shared/build/external/zipalign',
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


		return {

			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				successCb()
			},

			run: function( environmentConfig, argv, cwd, next) {
				spawnChildProcess(
					'zipalign',
					argv,
					java.getProcessEnv( environmentConfig, cwd ),
					true,
					next
				)

			}
		}
	}
)
