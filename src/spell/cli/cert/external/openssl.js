define(
	'spell/cli/cert/external/openssl',
	[
		'fs',
		'os',
		'spell/cli/spawnChildProcess'
	],
	function(
		fs,
		os,
		spawnChildProcess
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
				spawnChildProcess(
					getOpenSSLPath( environmentConfig ),
					argv,
					{ },
					true,
					next
				)
			}
		}
	}
)
