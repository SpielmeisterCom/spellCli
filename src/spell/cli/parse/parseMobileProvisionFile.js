define(
	'spell/cli/parse/parseMobileProvisionFile',
	[
		'fs',
		'plist'
	],
	function(
		fs,
		plist
		) {
		'use strict'

		var extractX509Cert = function( data ) {
			var certData = data.slice( data.indexOf("<data>")+6, data.indexOf("</data>"))
			certData =  "-----BEGIN CERTIFICATE-----" + certData.replace(/\t/g, "") + "-----END CERTIFICATE-----\n"
			return certData
		}

		return function( environmentConfig, filename, next ) {

			if( !fs.existsSync( filename ) ) {
				next()
			}

			fs.readFile( filename, 'utf8', function(err, data) {

					if (err) {
						next(err)

					} else {
						var strippedData = data.slice( data.indexOf("<?xml") )
						strippedData = strippedData.slice( 0, strippedData.indexOf("</plist>") + 8 )

						var contents = plist.parseStringSync( strippedData )

						next( contents )
					}
			})

		}
	}
)
