define(
	'spell/cli/build/external/tizen/sdk',
	[
		'fs',
		'path',
		'os',
		'spell/cli/util/spawnChildProcess'
	],
	function(
		fs,
		path,
		os,
	    spawnChildProcess
	) {

		'use strict'

		return {
			getToolPath: function( environmentConfig, toolName ) {
				if( !environmentConfig.tizenSdkPath ) {
					return "";
				}

				var toolPath = path.resolve(
					environmentConfig.tizenSdkPath,
					'tools',
					os.platform() == 'win32' ? toolName + '.bat' : toolName
				)

				return toolPath
			},

			checkPrerequisite: function( environmentConfig, toolName, successCb, failCb ) {
				var toolPath = this.getToolPath( environmentConfig, toolName )

				if( !toolPath || !fs.existsSync( toolPath ) ) {
					failCb(
						"\r\n" +
							"Could not find a installed web-packaging\r\n" +
							"The current tizenSdkPath is: " + environmentConfig.tizenSdkPath + "\r\n\r\n" +
							"Please download the tizen sdk from\r\n\r\n" +
							"  https://developer.tizen.org/downloads/tizen-sdk\r\n\r\n" +
							"Also check that the path to the tizen sdk is set correctly in the spellConfig.json (or via SpellEd)\r\n"

					)
					return
				}

				successCb()
			},


			run: function( environmentConfig, toolName, argv, cwd, next ) {
				spawnChildProcess(
					this.getToolPath( environmentConfig, toolName ),
					argv,
					{},
					true,
					next
				)
			}
		}
	}
)
