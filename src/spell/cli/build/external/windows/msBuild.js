define(
	'spell/cli/build/external/windows/msBuild',
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


		var getMSBuildPath = function( environmentConfig ) {
			if(!environmentConfig.msBuildPath) {
				return "";
			}

			var msBuildPath = path.resolve(
				environmentConfig.msBuildPath,
				'MSBuild.exe'
			)

			return msBuildPath
		}

		var checkPrerequisite = function( environmentConfig, successCb, failCb ) {
			var msBuildPath = getMSBuildPath( environmentConfig )

			if( !msBuildPath || !fs.existsSync( msBuildPath ) ) {
				failCb(
					"\r\n" +
						"Could not find a installed MSBuild.exe \r\n" +
						"The current msBuildPath is: " + environmentConfig.msBuildPath + "\r\n\r\n" +
						"Please install the .NET Framework \r\n" +
						"Also check that the path to the msBuildPath is set correctly in the spellConfig.json (or via SpellEd)\r\n"

				)
				return
			}

			successCb()
		}


		return {
			checkPrerequisite: checkPrerequisite,

			run: function( environmentConfig, argv, cwd, next) {
				spawnChildProcess(
					getMSBuildPath( environmentConfig ),
					argv,
					{},
					true,
					next
				)

			}
		}
	}
)
