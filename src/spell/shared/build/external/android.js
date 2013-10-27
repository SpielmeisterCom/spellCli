define(
	'spell/shared/build/external/android',
	[
		'spell/shared/build/external/java',

		'fs',
		'path',
		'os',
		'child_process',

		'spell/shared/build/spawnChildProcess'
	],
	function(
		java,
		fs,
		path,
		os,

		child_process,
		spawnChildProcess
	) {
		'use strict'

		var getAndroidToolPath = function( environmentConfig ) {
			var androidPath = path.resolve(
				environmentConfig.androidSdkPath,
				'tools',
				os.platform() == 'win32' ? 'android.bat' : 'android'
			)

			return androidPath
		}

		var checkPrerequisite = function( environmentConfig, successCb, failCb ) {
			var androidToolPath = getAndroidToolPath( environmentConfig )

			if( !fs.existsSync( androidToolPath ) ) {
				failCb( 'Could not find android-sdk/tools/android in ' + androidToolPath )
				return
			}

			child_process.exec(
				androidToolPath + ' list',
				function( error, stdout, stderr ) {
					if( error !== null ) {
						failCb( stderr.toString() )
						return
					}

					if( stdout.toString().match( /android-15/g ) ) {
						successCb()
						return

					} else {
						failCb(
							"\r\n\r\n" +
							"Android API level 15 is not installed in your local android sdk.\r\n" +
							"Please run " +
							( os.platform() == 'win32' ? "the Android SDK Manager (as Administrator) " : androidToolPath ) +
							" and install\r\n\r\n" +
							"  * Android SDK Build-tools\r\n" +
							"  * Android SDK Platform-tools\r\n" +
							"  * Android 4.0.3 (API15)\r\n" +
							" \r\n " +
							" If you're on a headless installation you can install these packages on the command line using\r\n" +
							"  " + androidToolPath + " update sdk -u -a --filter android-15,platform-tools,build-tools-18.1.1" +
							"\r\n"
						)
						return
					}
				}
			)
		}


		return {
			checkPrerequisite: checkPrerequisite,

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
