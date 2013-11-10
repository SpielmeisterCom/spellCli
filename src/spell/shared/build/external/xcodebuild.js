define(
	'spell/shared/build/external/xcodebuild',
	[
		'fs',
		'path',
		'os',
		'spell/shared/build/spawnChildProcess'
	],
	function(
		fs,
		path,
		os,
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
