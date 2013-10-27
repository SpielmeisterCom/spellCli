define(
	'spell/shared/build/external/ant',
	[
		'spell/shared/build/external/java',

		'fs',
		'os',
		'path',
		'spell/shared/build/spawnChildProcess'
	],
	function(
		java,
		fs,
		os,
		path,
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
				// build the android project
				spawnChildProcess(
					getAntPath( environmentConfig ),
					argv,
					java.getProcessEnv( environmentConfig, cwd ),
					true,
					next
				)

			}
		}
	}
)
