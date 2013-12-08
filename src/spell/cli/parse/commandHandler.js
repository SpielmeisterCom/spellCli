define(
	'spell/cli/parse/commandHandler',
	[
		'spell/cli/parse/parseMobileProvisionFile'
	],
	function(
		parseMobileProvisionFile
		) {
		'use strict'

		var outputHandler = function( data ) {
			console.log( JSON.stringify( data ) )
		}

		return function( environmentConfig, command, file ) {

			var commandMap = {
				'mobileprovision'     : parseMobileProvisionFile
			}

			if( command && commandMap[ command ] ) {
				commandMap[ command ].call( this, environmentConfig, file, outputHandler )
			} else {
				console.log( 'unknown command: ' + command )
			}
		}
	}
)
