define(
	'spell/shared/build/external/ant',
	[
		'spell/shared/build/external/java',

		'fs',
		'os',
		'path',
		'spell/shared/build/resolveWindowsShortName',
		'spell/shared/build/spawnChildProcess'
	],
	function(
		java,
		fs,
		os,
		path,
		resolveWindowsShortName,
		spawnChildProcess
	) {
		'use strict'

		var getAntPath = function( environmentConfig ) {

			return path.join( environmentConfig.spellCliPath, 'ant', 'bin', os.platform() == "win32" ? 'ant.bat' : 'ant' )
		}


		return {

			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				var antPath = getAntPath( environmentConfig )

				if( !fs.existsSync( antPath ) ) {
					failCb( 'Could not find ant in ' + antPath )
					return
				}

				successCb()
			},

			run: function( environmentConfig, argv, cwd, next ) {
				var processEnv = java.getProcessEnv( environmentConfig, cwd ),
					antPath    = getAntPath( environmentConfig )

				if( os.platform() == "win32" ) {

					resolveWindowsShortName( antPath, function( resolvedAntPath ) {
						console.log('[spellcli] Using resolved windows short path ' + resolvedAntPath )

						spawnChildProcess(
							resolvedAntPath,
							argv,
							processEnv,
							true,
							next
						)
					})

				} else {
					spawnChildProcess(
						antPath,
						argv,
						processEnv,
						true,
						next
					)
				}

			}
		}
	}
)
