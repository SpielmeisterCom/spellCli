define(
	'spell/shared/build/external/android',
	[
		'spell/shared/build/external/java',

		'fs',
		'path',
		'child_process',

		'spell/shared/build/spawnChildProcess'
	],
	function(
		java,
		fs,
		path,
		child_process,
		spawnChildProcess
	) {
		'use strict'

		var getAndroidToolPath = function( environmentConfig ) {
			var androidPath = path.resolve( environmentConfig.androidSdkPath, 'tools', 'android' )
			return androidPath
		}


		return {
			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				if( !environmentConfig || !environmentConfig.androidSdkPath ) {
					failCb(
						'Could not find androidSdk. Check your Android SDK path.'
					)

					return
				}

				child_process.exec(
					getAndroidToolPath( environmentConfig ) + ' list',
					function( error, stdout, stderr ) {
						if( error !== null ) {
							failCb( error )
						}

						if( stdout.toString().match( /android-15/g ) ) {
							successCb( error, stdout.toString() )

						} else {
							failCb(
								'Android API level 15 is not installed in your local android sdk. Please run the android tool manually and install it.',
								stdout.toString()
							)
						}
					}
				)
			},

			run: function( environmentConfig, argv, cwd, next) {
				spawnChildProcess(
					getAndroidToolPath( environmentConfig ),
					argv,
					java.getProcessEnv( environmentConfig, cwd ),
					true,
					next
				)

			}
		}
	}
)
