define(
	'spell/cli/build/external/windows/appPackager',
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


		var getMakeAppxPath = function( environmentConfig ) {
			if(!environmentConfig.windowsSdkPath) {
				return "";
			}

			var makeAppxPath = path.resolve(
				environmentConfig.windowsSdkPath,
				'x86',
				'makeappx.exe'
			)

			return makeAppxPath
		}

		var checkPrerequisite = function( environmentConfig, successCb, failCb ) {
			var makeAppxPath = getMakeAppxPath( environmentConfig )

			if( !makeAppxPath || !fs.existsSync( makeAppxPath ) ) {
				failCb(
					"\r\n" +
						"Could not find a installed MakeAppx.exe \r\n" +
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
					getMakeAppxPath( environmentConfig ),
					argv,
					{},
					true,
					next
				)

			}
		}
	}
)
