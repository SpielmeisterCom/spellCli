define(
	'spell/cli/cert/commandHandler',
	[
		'spell/cli/cert/external/openssl',
		'spell/cli/cert/external/keytool'
	],
	function(
		openssl,
	    keytool
		) {
		'use strict'

		var genIosPrivKey = function( environmentConfig ) {
			var params = [
				'genrsa',
				'-out',
				'mykey.key', //TODO: make key configurable
				'2048'
			]

			openssl.run( environmentConfig, params, '', function() { })
		}

		var genIosCsr = function( environmentConfig ) {
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

			openssl.run( environmentConfig, params, '', function() { })
		}

		var genAndroidPrivKey = function( environmentConfig ) {
			var params = [
				'-genkey',
				'-noprompt',

				'-dname',
				'CN=mqttserver.ibm.com, OU=ID, O=IBM, L=Hursley, S=Hants, C=GB', //TODO: make this configurable

				'-keystore',
				'my-release-key.keystore', //TODO: make this configurable

				'-storepass',
				'xyzxyz', //TODO: make this configurable storepass must be at least 6 characters long

				'-keypass',
				'xyzxyz', //TODO: make this configurable

				'-alias',
				'alias_name', //TODO: make this configurable

				'-keyalg',
				'RSA',

				'-keysize',
				'2048',

				'-validity',
				'10000'
			]

			keytool.run( environmentConfig, params, '', function() { } )

		}

		return function( environmentConfig, command ) {
			var commandMap = {
				'geniosprivkey'     : genIosPrivKey,
				'genioscsr'         : genIosCsr,
				'genandroidprivkey' : genAndroidPrivKey
			}

			if( command && commandMap[ command ] ) {
				commandMap[ command ].call( this, environmentConfig )
			} else {
				console.log( 'unknown command: ' + command )
			}
		}
	}
)
