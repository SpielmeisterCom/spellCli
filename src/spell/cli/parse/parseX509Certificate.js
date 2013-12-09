define(
	'spell/cli/parse/parseX509Certificate',
	[
		'fs',
		'spell/cli/cert/external/openssl',
		'underscore'
	],
	function(
		fs,
		openssl,
		_
		) {
		'use strict'

		var parseOpenSSLOutput = function( next, output ) {
			var lines = output.toString().split("\n"),
				certData = {}

			_.each( lines, function( line ) {
				var parts = line.split("="),
					key   = parts.shift(),
					value = parts.join('=')

				if( !key ) {
					return
				}

				certData[ key ] = value
			})

			next( certData )
		}

		return function( environmentConfig, filename, next ) {

			if( !fs.existsSync( filename ) ) {
				next()
			}

			var params = [
				'x509',
				'-in',
				filename,
				'-issuer',
				'-subject',
				'-dates',
				'-fingerprint',
				'-noout'
			]

			openssl.run(
				environmentConfig,
				params,
				'',
				_.bind( parseOpenSSLOutput, this,  next )
			)

		}
	}
)
