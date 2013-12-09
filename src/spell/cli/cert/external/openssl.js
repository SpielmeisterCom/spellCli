define(
	'spell/cli/cert/external/openssl',
	[
		'fs',
		'os',
		'child_process'
	], function(
		fs,
		os,
		child_process
	) {
		'use strict'

		var getOpenSSLPath = function( environmentConfig ) {

			if( os.platform() == "win32" ) {
				return path.join( environmentConfig.spellCliPath, 'openssl', 'openssl.exe' )
			} else {
				return '/usr/bin/openssl'
			}
		}

		return {
			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				var opensslPath = getOpenSSLPath( environmentConfig )

				if ( ! fs.existsSync( opensslPath ) ) {
					failCb( 'Could not find openssl tool in ' + opensslPath )
				}

				successCb();
			},

			run: function(environmentConfig, argv, cwd, next) {
				child_process.exec(
					getOpenSSLPath( environmentConfig ) + ' ' + argv.join(" "),
					function( error, stdout, stderr ) {
						if( error !== null ) {
							next( stderr.toString() )
							return
						}

						next( stdout.toString() )
					}
				)
			}
		}
	}
)
