define(
	'spell/cli/build/external/ant',
	[
		'spell/cli/build/external/java',

		'fs',
		'os',
		'path',
		'spell/cli/util/resolveWindowsShortDirectoryName',
		'spell/cli/util/spawnChildProcess'
	],
	function(
		java,
		fs,
		os,
		path,
		resolveWindowsShortDirectoryName,
		spawnChildProcess
	) {
		'use strict'

		var getAntPath = function( environmentConfig ) {
			return path.join( environmentConfig.spellCliPath, 'ant', 'bin' )
		}

		var getAntExecutable = function() {
			return os.platform() == "win32" ? 'ant.bat' : 'ant'
		}


		return {

			checkPrerequisite: function( environmentConfig, successCb, failCb ) {
				var antExecutable = path.join( getAntPath( environmentConfig ), getAntExecutable( ) )

				if( !fs.existsSync( antExecutable ) ) {
					failCb( 'Could not find ant in ' + antExecutable )
					return
				}

				successCb()
			},

			run: function( environmentConfig, argv, cwd, next ) {
				var processEnv = java.getProcessEnv( environmentConfig, cwd ),
					antPath    = getAntPath( environmentConfig )

				if( os.platform() == "win32" ) {

					resolveWindowsShortDirectoryName( antPath, function( resolvedAntPath ) {
						var windowsPath = path.join( resolvedAntPath, getAntExecutable( ) )

						console.log('[spellcli] resolved ant path to ' + windowsPath)
						spawnChildProcess(
							windowsPath,
							argv,
							processEnv,
							true,
							next
						)
					})

				} else {
					spawnChildProcess(
						path.join( antPath, getAntExecutable( ) ),
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
