define(
	'spell/shared/build/external/ant',
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

				//TODO
				successCb()
			},

			run: function( environmentConfig, argv, cwd, next ) {
				// build the android project
				spawnChildProcess(
					'ant',
					argv,
					java.getProcessEnv( environmentConfig, cwd ),
					true,
					next
				)

			}
		}
	}
)
