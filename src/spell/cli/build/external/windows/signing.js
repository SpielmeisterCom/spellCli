define(
	'spell/cli/build/external/windows/signing',
	[
		'fs',
		'path',
		'os',
		'child_process',

		'spell/cli/util/spawnChildProcess'
	],
	function(
		fs,
		path,
		os,
		child_process,

		spawnChildProcess
	) {
		'use strict'


		var getSignToolPath = function( environmentConfig ) {
			if(!environmentConfig.windowsSdkPath) {
				return "";
			}

			var signToolPath = path.resolve(
				environmentConfig.windowsSdkPath,
				'x86',
				'SignTool.exe'
			)

			return signToolPath
		}

		var checkPrerequisite = function( environmentConfig, successCb, failCb ) {
			var signToolPath = getSignToolPath( environmentConfig )

			if( !signToolPath || !fs.existsSync( signToolPath ) ) {
				failCb(
					"\r\n" +
						"Could not find a installed SignTool.exe \r\n" +
						"The current windowsSdkPath is: " + environmentConfig.windowsSdkPath + "\r\n\r\n" +
						"Please download the Windows Software Development Kit (SDK) for Windows 8 from\r\n\r\n" +
						"  http://msdn.microsoft.com/en-us/windows/apps/br229516.aspx\r\n\r\n" +
						"Also check that the path to the windowsSdkPath is set correctly in the spellConfig.json (or via SpellEd)\r\n"

				)
				return
			}

			successCb()
		}


		return {
			checkPrerequisite: checkPrerequisite,

			run: function( environmentConfig, argv, cwd, next) {
				spawnChildProcess(
					getSignToolPath( environmentConfig ),
					argv,
					{},
					true,
					next
				)

			}
		}
	}
)
