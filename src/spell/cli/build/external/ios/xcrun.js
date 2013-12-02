define(
	'spell/cli/build/external/ios/xcrun',
	[
		'fs',
		'path',
		'os',
		'spell/cli/spawnChildProcess'
	],
	function(
		fs,
		path,
		os,
		spawnChildProcess
		) {
		'use strict'

		var getXcrunPath = function( environmentConfig ) {
			return '/usr/bin/xcrun'
		}

		return {
			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				if( !fs.existsSync( getXcrunPath( environmentConfig ) ) ) {
					failCb( 'Could not find xcrun. Please make sure that Xcode is installed.' )
					return
				}

				successCb()
			},

			run: function( environmentConfig, argv, cwd, next ) {

				spawnChildProcess(
					getXcrunPath( environmentConfig ),
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
