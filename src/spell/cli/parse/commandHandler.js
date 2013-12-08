define(
	'spell/cli/parse/commandHandler',
	[
		'spell/cli/parse/parseMobileProvisionFile',
		'spell/cli/parse/parseX509Certificate'
	],
	function(
		parseMobileProvisionFile,
		parseX509Certificate
		) {
		'use strict'

		var outputHandler = function( data ) {
			console.log( JSON.stringify( data ) )
		}

		return function( environmentConfig, command, file ) {

			var commandMap = {
				'mobileprovision'     : parseMobileProvisionFile,
				'x509'				  : parseX509Certificate
			}

			if( command && commandMap[ command ] ) {
				commandMap[ command ].call( this, environmentConfig, file, outputHandler )
			} else {
				console.log( 'unknown command: ' + command )
			}
		}
	}
)
