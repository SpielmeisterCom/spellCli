define(
	'spell/shared/build/external/tizen/web-packaging',
	[
		'spell/shared/build/external/tizen/sdk'
	],
	function(
		sdk
	) {
		'use strict'


		return {
			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				return sdk.checkPrerequisite( environmentConfig, 'web-packaging', successCb, failCb )
			},

			run: function( environmentConfig, argv, cwd, next) {
				return sdk.run( environmentConfig, 'web-packaging', argv, cwd, next )
			}
		}
	}
)
