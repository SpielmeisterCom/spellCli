define(
	'spell/shared/build/external/zipalign',
	[
		'spell/shared/build/external/java',

		'fs',
		'path',
		'os',
		'spell/shared/build/spawnChildProcess'
	],
	function(
		java,
		fs,
		path,
		os,
		spawnChildProcess
	) {
		'use strict'


		var getZipAlignPath = function( environmentConfig ) {

			return path.resolve(
				environmentConfig.androidSdkPath,
				'tools',
				os.platform() == 'win32' ? 'zipalign.exe' : 'zipalign'
			)
		}

		return {

			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				successCb()
			},

			run: function( environmentConfig, argv, cwd, next) {
				spawnChildProcess(
					getZipAlignPath( environmentConfig ),
					argv,
					java.getProcessEnv( environmentConfig, cwd ),
					true,
					next
				)

			}
		}
	}
)
