define(
	'spell/cli/cert/certCommandHandler',
	[
		'spell/cli/cert/external/openssl'
	],
	function(
		openssl
		) {
		'use strict'

		return {
			handleCommand: function( command ) {
				if( command == 'genprivkey' ) {

					var params = [
						'genrsa',
						'-out',
						'mykey.key', //TODO: make key configurable
						'2048'
					]

					openssl.run({}, params, '', function() { })

				} else if ( command == 'gencsr' ) {
					var params = [
						'req',
						'-new',
						'-key',
						'mykey.key', //TODO: make key configurable
						'-out',
						'cert.csr', //TODO: make outfile configurable
						'-subj',
						'/emailAddress=yourAddress@example.com, CN=John Doe, C=US'
					]

					openssl.run({}, params, '', function() { })

				} else {
					console.log( 'unknown command: ' + command )
				}
			}
		}
	}
)
