define(
	'spell/cli/build/external/tizen/web-signing',
	[
		'spell/cli/build/external/tizen/sdk'
	],
	function(
		sdk
	) {
		'use strict'


		return {
			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				return sdk.checkPrerequisite( environmentConfig, 'web-signing', successCb, failCb )
			},

			run: function( environmentConfig, argv, cwd, next) {
				return sdk.run( environmentConfig, 'web-signing', argv, cwd, next )
			}
		}
	}
)
