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
			var androidPath = path.resolve( environmentConfig.androidSdkPath, 'tools', os.platform() == 'win32' ? 'android.bat' : 'android' )
			return androidPath
		}

		var checkPrerequisite = function( environmentConfig, successCb, failCb, autoFail) {
			var androidToolPath = getAndroidToolPath( environmentConfig )

			if( !fs.existsSync( androidToolPath ) ) {
				failCb( 'Could not find android-sdk/tools/android in ' + androidToolPath )
				return
			}

			child_process.exec(
				androidToolPath + ' list',
				function( error, stdout, stderr ) {
					if( error !== null ) {
						failCb( stderr )
						return
					}

					if( stdout.toString().match( /android-15/g ) ) {
						successCb( error, stdout.toString() )
						return

					} else {

						if( autoFail ) {
							failCb(
								'Android API level 15 is not installed in your local android sdk. Please run the android-sdk/tools/android tool manually and install android api level 15, platform-tools and build-tools.',
								stdout.toString()
							)
							return

						} else {
							console.log( '[spellcli] android sdk installed, but missing api level 15. Installing it now...' )

							child_process.exec(
								'echo y | ' + androidToolPath + ' update sdk -u -a --filter android-15,platform-tools,build-tools-18.1.1',
								function( error, stdout, stderr ) {
									checkPrerequisite( environmentConfig, successCb, failCb, true)
								})
						}
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
