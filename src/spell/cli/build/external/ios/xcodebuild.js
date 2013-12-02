define(
	'spell/cli/build/external/ios/xcodebuild',
	[
		'fs',
		'path',
		'os',
		'child_process',
		'spell/cli/util/spawnChildProcess'
	],
	function(
		fs,
		path,
		os,
		child_process,
		spawnChildProcess
		) {
		'use strict'

		var getXcodeBuildPath = function( environmentConfig ) {
			return '/usr/bin/xcodebuild'
		}

		return {
			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				if( !fs.existsSync( getXcodeBuildPath( environmentConfig ) ) ) {
					failCb( 'Could not find xcodebuild. Please make sure that Xcode is installed.' )
					return
				}

				successCb()
			},

			getInstalledSdks: function( environmentConfig, successCb, failCb ) {
				child_process.exec(
					getXcodeBuildPath() + ' -version -sdk',
					function( error, stdout, stderr ) {
						var SDKs     = []

						if( error !== null ) {
							failCb()
						}

						var sdkstart = stdout.indexOf('iphoneos');

						while (sdkstart != -1) {
							var sdkend = stdout.indexOf(')', sdkstart);
							var sdkstr = stdout.slice(sdkstart, sdkend);
							SDKs.push(sdkstr);

							sdkstart = stdout.indexOf('iphoneos', sdkend);
						}
						SDKs.sort().reverse();

						successCb( SDKs )
					}
				)
			},

			run: function( environmentConfig, argv, cwd, next ) {

				spawnChildProcess(
					getXcodeBuildPath( environmentConfig ),
					argv,
					{
						cwd: cwd
					},
					true,
					next
				)
			}
		}
	}
)
